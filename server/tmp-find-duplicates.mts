// READ-ONLY duplicate-ticket analysis. Performs NO writes.
import 'dotenv/config';
import { prisma } from './src/lib/prisma';

function norm(s: string | null | undefined): string {
  return (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function similar(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = norm(a), nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const wa = new Set(na.split(' ')), wb = new Set(nb.split(' '));
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter++;
  return inter / Math.min(wa.size, wb.size) >= 0.8;
}

async function main() {
  const tickets = await prisma.ticket.findMany({
    select: { id: true, ticketNumber: true, title: true, description: true, senderName: true, senderEmail: true, status: true, createdAt: true, assigneeId: true },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`TOTAL_TICKETS=${tickets.length}`);
  const users = await prisma.user.findMany({ select: { id: true, name: true } });
  const nameOf = (id: string | null) => users.find(u => u.id === id)?.name ?? null;

  // Evidence 1-4: same inbound email message-id attached to multiple tickets
  const msgs = await prisma.emailMessage.findMany({
    where: { direction: 'INBOUND' },
    select: { messageId: true, subject: true, ticketId: true, createdAt: true },
  });
  const byMsg = new Map<string, typeof msgs>();
  for (const m of msgs) {
    const arr = byMsg.get(m.messageId) ?? [];
    arr.push(m); byMsg.set(m.messageId, arr);
  }
  const msgGroups: string[][] = [];
  for (const [mid, arr] of byMsg) {
    const ids = [...new Set(arr.map(a => a.ticketId))];
    if (ids.length > 1) {
      msgGroups.push(ids);
      console.log('SHARED_INBOUND_MESSAGE_ID', JSON.stringify({ messageId: mid, ticketIds: ids }));
    }
  }

  // Content-based grouping: same customer email + similar title/description
  const groups: any[][] = [];
  for (let i = 0; i < tickets.length; i++) {
    for (let j = i + 1; j < tickets.length; j++) {
      const a = tickets[i], b = tickets[j];
      if (norm(a.senderEmail) !== norm(b.senderEmail)) continue;
      if (!(similar(a.title, b.title) && similar(a.description, b.description))) continue;
      let g = groups.find(g => g.includes(a));
      if (!g) g = groups.find(g => g.includes(b));
      if (!g) { g = []; groups.push(g); }
      if (!g.includes(a)) g.push(a);
      if (!g.includes(b)) g.push(b);
      console.log('CONTENT_PAIR', JSON.stringify({
        t1: { num: a.ticketNumber, title: a.title }, t2: { num: b.ticketNumber, title: b.title },
        email: a.senderEmail, dtMinutes: Math.abs(+a.createdAt - +b.createdAt) / 60000,
      }));
    }
  }

  console.log('\n=== GROUP SUMMARY ===');
  for (const g of groups) {
    for (const t of g.sort((x, y) => +x.createdAt - +y.createdAt)) {
      console.log(JSON.stringify({
        id: t.id, num: t.ticketNumber, title: t.title,
        email: t.senderEmail, created: t.createdAt.toISOString(), status: t.status,
        assignee: nameOf(t.assigneeId),
        descStart: (t.description ?? '').slice(0, 120),
      }));
    }
    console.log('---');
  }

  // Also list shared-thread (gmailThreadId / inReplyTo chains) evidence
  const threads = await prisma.emailMessage.groupBy({
    by: ['gmailThreadId'], where: { gmailThreadId: { not: null } }, _count: { ticketId: true },
  });
  void threads;
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());

// extra read-only safety check
const candidates = ['3a18c4a1-ba60-49e6-ab92-7f579465272f','09dd74bb-7a83-43bd-a9df-953c91325c36','38de4955-c3c4-43fa-911b-5975836bd437','ed50a08d-7f64-4328-a7f8-f93c496ba84c','fd505487-e37c-4cc6-a991-8898c000735d','192ef76c-1c0b-4de0-a72c-a129835178a7','7139f948-bd28-452f-93ee-ecaba92baa81'];
setTimeout(async () => {
  const { prisma } = await import('./src/lib/prisma');
  for (const id of candidates) {
    const r = await prisma.reply.count({ where: { ticketId: id } });
    const e = await prisma.emailMessage.count({ where: { ticketId: id } });
    console.log('CANDIDATE', id, 'replies=' + r, 'emails=' + e);
  }
  process.exit(0);
}, 1000);
