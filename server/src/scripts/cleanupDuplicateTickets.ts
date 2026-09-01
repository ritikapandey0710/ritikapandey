import 'dotenv/config';
import { prisma } from '../lib/prisma';

/**
 * SAFE maintenance utility to clean up duplicate / old test-artifact tickets.
 *
 * DEFAULT MODE IS A DRY RUN — it only prints the exact plan and touches nothing.
 * Pass `--apply` to actually perform the deletions (guarded by the
 * CLEANUP_CONFIRM=yes environment variable).
 *
 * CRITERIA (objective, conservative):
 *   A) Duplicate groups — tickets sharing the same normalized sender email +
 *      normalized title + gmailThreadId. For each group with >1 ticket, keep the
 *      NEWEST ticket (canonical / most complete) and delete the OLDER excess
 *      rows ONLY when the older row's status is RESOLVED or CLOSED. Groups with
 *      more than one active ticket are left untouched (not confidently
 *      duplicates).
 *   B) Old solved test artifacts — RESOLVED/CLOSED, at least AGE_MIN_DAYS old,
 *      matching test markers in title/senderName/senderEmail, and NOT part of a
 *      Gmail thread.
 *
 * Deletion preserves integrity: for each removed ticket its EmailMessage and
 * Reply rows are deleted first (same dependency order as deleteTicket), then
 * the Ticket row.
 *
 * Usage:
 *   bun run scripts/cleanupDuplicateTickets.ts           # dry run (default)
 *   bun run scripts/cleanupDuplicateTickets.ts --apply   # guarded deletion
 */

const AGE_MIN_DAYS = 2;
// Word-boundary test markers only, so common substrings inside real names
// (e.g. "Tripathi", "Ishita") never match. A real customer name/sender never
// contains a standalone test/demo/hello token.
const TEST_MARKER = /\b(test|demo|sample|dummy|lorem|ignore|hello)\b/i;

interface TicketRow {
  id: string;
  ticketNumber: number;
  senderName: string;
  senderEmail: string;
  status: string;
  createdAt: Date;
  title: string;
  emailMessages: { gmailThreadId: string | null }[];
}

function norm(s: string): string {
  return (s || '').trim().toLowerCase();
}

async function buildDeletePlan(): Promise<{ rows: TicketRow[]; reason: string }[]> {
  const tickets = await prisma.ticket.findMany({
    orderBy: { createdAt: 'asc' },
    include: { emailMessages: { select: { gmailThreadId: true } } },
  });
  const plan: { rows: TicketRow[]; reason: string }[] = [];

  // A) Duplicate groups
  const byKey = new Map<string, TicketRow[]>();
  for (const t of tickets) {
    const thread = t.emailMessages.find((e) => e.gmailThreadId)?.gmailThreadId || '_no_thread';
    const key = `${norm(t.senderEmail)}|${norm(t.title)}|${thread}`;
    const arr = byKey.get(key) || [];
    arr.push(t);
    byKey.set(key, arr);
  }
  const duplicateIds = new Set<string>();
  for (const [, arr] of byKey) {
    if (arr.length <= 1) continue;
    // Newest is canonical; only consider older rows that are already solved.
    const olderSolved = arr
      .slice(0, -1)
      .filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED');
    if (olderSolved.length === 0) continue; // active duplicates — not safe, keep all
    for (const t of olderSolved) duplicateIds.add(t.id);
    plan.push({
      rows: olderSolved,
      reason: 'duplicate group (same sender+subject+thread), solved older copies',
    });
  }

  // B) Old solved test artifacts
  const cutoff = new Date(Date.now() - AGE_MIN_DAYS * 24 * 60 * 60 * 1000);
  const testCandidates: TicketRow[] = [];
  for (const t of tickets) {
    if (t.createdAt >= cutoff) continue;
    if (t.status !== 'RESOLVED' && t.status !== 'CLOSED') continue;
    if (t.emailMessages.some((e) => e.gmailThreadId)) continue; // real thread — keep
    if (!TEST_MARKER.test(`${t.title} ${t.senderName} ${t.senderEmail}`)) continue;
    if (duplicateIds.has(t.id)) continue; // already flagged in (A)
    testCandidates.push(t);
  }
  if (testCandidates.length > 0) {
    plan.push({ rows: testCandidates, reason: 'old solved test artifact (marker + no thread)' });
  }

  return plan;
}

async function deleteTicket(id: string): Promise<void> {
  await prisma.$transaction([
    prisma.emailMessage.deleteMany({ where: { ticketId: id } }),
    prisma.reply.deleteMany({ where: { ticketId: id } }),
    prisma.ticket.delete({ where: { id } }),
  ]);
}

async function main() {
  const apply = process.argv.includes('--apply');

  const plan = await buildDeletePlan();
  const allIds = new Set<string>();
  const rowsFlat = plan.flatMap((p) => p.rows);
  for (const r of rowsFlat) allIds.add(r.id);

  console.log(`MODE: ${apply ? 'APPLY (destructive)' : 'DRY RUN (no writes)'}`);
  console.log(`Groups: ${plan.length}  | Tickets that would be deleted: ${allIds.size}\n`);

  for (const p of plan) {
    console.log(`• ${p.reason} (${p.rows.length})`);
    for (const t of p.rows) {
      const emails = await prisma.emailMessage.count({ where: { ticketId: t.id } });
      const replies = await prisma.reply.count({ where: { ticketId: t.id } });
      const thread = t.emailMessages.find((e) => e.gmailThreadId)?.gmailThreadId || null;
      console.log(
        `    #${t.ticketNumber} ${t.status} ${t.createdAt.toISOString()}` +
          ` thread=${thread ?? '-'} emails=${emails} replies=${replies}` +
          ` sender="${t.senderName}" subj="${t.title}"`
      );
    }
  }

  if (!apply) {
    console.log('\n[DRY RUN] Nothing was deleted. Re-run with --apply to perform deletion.');
    return;
  }

  if (!process.env.CLEANUP_CONFIRM) {
    console.error(
      '\nABORT: destructive --apply requires CLEANUP_CONFIRM=yes to proceed. No changes were made.'
    );
    return;
  }

  let deleted = 0;
  for (const id of allIds) {
    try {
      await deleteTicket(id);
      deleted++;
    } catch (e: any) {
      console.error(`Failed to delete ticket ${id}:`, e && e.message ? e.message : e);
    }
  }
  console.log(`\nDone. Deleted ${deleted}/${allIds.size} tickets.`);
}

main()
  .catch((e) => {
    console.error('CLEANUP ERROR:', e && e.message ? e.message : e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });