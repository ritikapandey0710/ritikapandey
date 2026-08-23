import { prisma } from "../lib/prisma";
import { sendEmailWithRetry } from "./resend.service";

/**
 * Phase 5: outbound email delivery reliability.
 *
 * The inline send paths (agent replies, ticket-created notifications) already
 * retry transient failures within a single request. This worker provides the
 * second line of defense: it periodically scans EmailMessage rows for outbound
 * emails that are still QUEUED or FAILED and re-sends them using the stored
 * snapshot (toAddress / subject / bodyHtml), with exponential backoff, until
 * they are sent or attempts are exhausted.
 *
 * Delivery status lifecycle (forward-only):
 *   QUEUED -> SENT -> DELIVERED | BOUNCED   (DELIVERED/BOUNCED via Resend webhook)
 *   QUEUED -> FAILED -> (retry) -> SENT | FAILED(exhausted)
 */

/** Maximum total send attempts per outbound email (inline + worker combined). */
export const MAX_DELIVERY_ATTEMPTS = 5;

/** Backoff schedule (minutes) before the Nth retry, indexed by retryCount. */
const RETRY_BACKOFF_MINUTES = [1, 5, 30, 120];

/**
 * Rows stuck in QUEUED whose inline send never recorded an attempt (e.g. the
 * process crashed between creating the QUEUED row and calling Resend) become
 * retryable after this delay.
 */
const STALE_QUEUED_MS = 5 * 60 * 1000;

function computeNextRetryAt(retryCount: number): Date | null {
  const idx = Math.min(Math.max(retryCount - 1, 0), RETRY_BACKOFF_MINUTES.length - 1);
  return new Date(Date.now() + RETRY_BACKOFF_MINUTES[idx] * 60 * 1000);
}

/**
 * Process all due outbound emails. Returns the number of rows processed.
 *
 * A row is "due" when:
 *   - direction = OUTBOUND
 *   - deliveryStatus is QUEUED or FAILED
 *   - retryCount < MAX_DELIVERY_ATTEMPTS
 *   - nextRetryAt is null or in the past
 *   - either it has been attempted before, or it has been sitting unattempted
 *     for longer than STALE_QUEUED_MS (crash recovery)
 */
export async function processDueEmails(now: Date = new Date()): Promise<number> {
  const staleCutoff = new Date(now.getTime() - STALE_QUEUED_MS);

  const dueRows = await prisma.emailMessage.findMany({
    where: {
      direction: "OUTBOUND",
      deliveryStatus: { in: ["QUEUED", "FAILED"] },
      retryCount: { lt: MAX_DELIVERY_ATTEMPTS },
      OR: [
        { nextRetryAt: null, lastAttemptAt: { not: null } },
        { nextRetryAt: { lte: now } },
        // Crash recovery: queued but never attempted, and stale.
        { nextRetryAt: null, lastAttemptAt: null, createdAt: { lte: staleCutoff } },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  let processed = 0;

  for (const row of dueRows) {
    processed++;
    try {
      await retryOutboundEmail(row.id, now);
    } catch (error) {
      console.error(
        `emailDelivery.worker: unexpected error processing EmailMessage ${row.id}:`,
        error
      );
    }
  }

  return processed;
}

/**
 * Attempt a single (re)send of one outbound EmailMessage row by id.
 * Safe to call directly (e.g. from tests); guards against concurrent claims
 * via a conditional update that sets lastAttemptAt first.
 */
export async function retryOutboundEmail(
  emailMessageId: string,
  now: Date = new Date()
): Promise<"SENT" | "FAILED" | "SKIPPED"> {
  const row = await prisma.emailMessage.findUnique({
    where: { id: emailMessageId },
  });

  if (!row || row.direction !== "OUTBOUND") return "SKIPPED";
  if (
    !row.deliveryStatus ||
    !["QUEUED", "FAILED"].includes(row.deliveryStatus)
  ) {
    return "SKIPPED";
  }
  if (row.retryCount >= MAX_DELIVERY_ATTEMPTS) return "SKIPPED";

  // Snapshot data is required to re-send. Rows without a snapshot (legacy
  // Phase 4 rows) cannot be retried safely; leave them as-is.
  if (!row.toAddress || !row.bodyHtml) {
    console.warn(
      `emailDelivery.worker: EmailMessage ${row.id} has no send snapshot; skipping`
    );
    return "SKIPPED";
  }

  // Claim the row so concurrent workers don't double-send.
  const claimed = await prisma.emailMessage.updateMany({
    where: {
      id: row.id,
      deliveryStatus: row.deliveryStatus,
      lastAttemptAt: row.lastAttemptAt,
    },
    data: {
      lastAttemptAt: now,
      retryCount: { increment: 1 },
    },
  });
  if (claimed.count === 0) {
    // Another worker claimed it first.
    return "SKIPPED";
  }

  const attemptNumber = row.retryCount + 1;
  const result = await sendEmailWithRetry(row.toAddress, row.subject ?? "(no subject)", row.bodyHtml);

  if (result.emailId) {
    try {
      await prisma.emailMessage.update({
        where: { id: row.id },
        data: {
          messageId: result.emailId,
          deliveryStatus: "SENT",
          lastError: null,
          nextRetryAt: null,
          retryCount: attemptNumber,
          lastAttemptAt: now,
        },
      });
      console.log(
        `emailDelivery.worker: EmailMessage ${row.id} sent after ${attemptNumber} attempt(s)`
      );
      return "SENT";
    } catch (error: any) {
      // P2002: the Resend email ID is already tracked on another row — the
      // email went out; just drop our duplicate tracking row's claim.
      if (error?.code === "P2002") {
        console.log(
          `emailDelivery.worker: EmailMessage ${row.id} duplicate send detected (email already tracked)`
        );
        return "SENT";
      }
      throw error;
    }
  }

  // Send failed again: schedule the next retry or exhaust.
  const willRetry = attemptNumber < MAX_DELIVERY_ATTEMPTS;
  await prisma.emailMessage.update({
    where: { id: row.id },
    data: {
      deliveryStatus: "FAILED",
      lastError: result.error ?? "Resend unavailable or failed",
      retryCount: attemptNumber,
      lastAttemptAt: now,
      nextRetryAt: willRetry ? computeNextRetryAt(attemptNumber) : null,
    },
  }).catch((err) =>
    console.error(
      `emailDelivery.worker: failed to record FAILED state for EmailMessage ${row.id}:`,
      err
    )
  );

  console.error(
    `emailDelivery.worker: EmailMessage ${row.id} send failed (attempt ${attemptNumber}/${MAX_DELIVERY_ATTEMPTS}): ${result.error ?? "unknown"}`
  );
  return "FAILED";
}

/**
 * Start the background delivery worker. Returns the interval handle so tests
 * and graceful shutdown can clear it.
 */
export function startDeliveryWorker(intervalMs: number = 60_000): NodeJS.Timeout {
  console.log(`Starting email delivery worker every ${intervalMs / 1000}s`);

  const tick = async () => {
    try {
      const count = await processDueEmails();
      if (count > 0) {
        console.log(`emailDelivery.worker: processed ${count} due outbound email(s)`);
      }
    } catch (error) {
      console.error("emailDelivery.worker: tick failed:", error);
    }
  };

  // First run shortly after startup, then on the interval.
  setTimeout(tick, 10_000).unref?.();
  const interval = setInterval(tick, intervalMs);
  interval.unref?.();
  return interval;
}