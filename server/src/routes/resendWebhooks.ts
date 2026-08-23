import { Router } from "express";
import { prisma } from "../lib/prisma";

/**
 * Phase 5: Resend delivery-event webhook.
 *
 * Receives email lifecycle events from Resend (email.delivered, email.bounced,
 * email.complained) and updates the corresponding OUTBOUND EmailMessage row
 * (matched by Resend's email id stored in `messageId`).
 *
 * Status transitions are forward-only:
 *   SENT -> DELIVERED | BOUNCED
 * Rows already in a terminal state are never moved backward.
 */

const router = Router();

interface ResendWebhookEvent {
  type: string;
  data: {
    email_id?: string;
    [key: string]: any;
  };
}

router.post("/", async (req, res) => {
  const event = req.body as ResendWebhookEvent;

  if (!event || typeof event.type !== "string") {
    return res.status(400).json({ error: "Invalid webhook payload" });
  }

  const emailId = event.data?.email_id;
  if (!emailId || typeof emailId !== "string") {
    // No email reference — nothing to update. Acknowledge so Resend stops retrying.
    return res.json({ received: true, updated: false });
  }

  let targetStatus: "DELIVERED" | "BOUNCED" | null = null;
  if (event.type === "email.delivered") {
    targetStatus = "DELIVERED";
  } else if (
    event.type === "email.bounced" ||
    event.type === "email.complained"
  ) {
    targetStatus = "BOUNCED";
  } else {
    // Unhandled event type (e.g. email.sent, email.opened): acknowledge.
    return res.json({ received: true, updated: false });
  }

  try {
    const row = await prisma.emailMessage.findUnique({
      where: { messageId: emailId },
      select: { id: true, direction: true, deliveryStatus: true },
    });

    if (!row || row.direction !== "OUTBOUND") {
      console.warn(
        `resendWebhook: no outbound EmailMessage found for email_id=${emailId} (${event.type})`
      );
      return res.json({ received: true, updated: false });
    }

    // Forward-only transitions.
    if (row.deliveryStatus === "DELIVERED" || row.deliveryStatus === "BOUNCED") {
      return res.json({ received: true, updated: false });
    }

    await prisma.emailMessage.update({
      where: { id: row.id },
      data: {
        deliveryStatus: targetStatus,
        nextRetryAt: null,
        lastError:
          targetStatus === "BOUNCED"
            ? `${event.type}: ${JSON.stringify(event.data).substring(0, 500)}`
            : null,
      },
    });

    console.log(`resendWebhook: ${event.type} -> EmailMessage ${row.id} marked ${targetStatus}`);
    return res.json({ received: true, updated: true });
  } catch (error) {
    console.error("resendWebhook: failed to process event:", error);
    // Return 500 so Resend retries delivery of this event.
    return res.status(500).json({ error: "Failed to process resend webhook event" });
  }
});

export default router;