import { prisma } from './src/lib/prisma';

async function main() {
  const tid = process.argv[2];
  const ticket = await prisma.ticket.findUnique({
    where: { id: tid },
    include: {
      replies: { orderBy: { createdAt: 'asc' }, include: { author: { select: { name: true, email: true } } } },
      emailMessages: true,
      user_Ticket_assigneeIdTouser: { select: { name: true } },
      user_Ticket_reporterIdTouser: { select: { name: true, email: true } },
    },
  });
  if (!ticket) { console.log('ticket not found'); return; }
  console.log(JSON.stringify({
    id: ticket.id, title: ticket.title, status: ticket.status, category: ticket.category,
    priority: ticket.priority, senderName: ticket.senderName, senderEmail: ticket.senderEmail,
    resolvedByAI: (ticket as any).resolvedByAI, resolvedAt: (ticket as any).resolvedAt,
    assignee: ticket.user_Ticket_assigneeIdTouser?.name ?? null,
    reporter: ticket.user_Ticket_reporterIdTouser,
  }, null, 2));
  console.log('--- replies ---');
  for (const r of ticket.replies) {
    console.log(`${r.createdAt.toISOString()} [${r.senderType}] ${r.author?.name}: ${r.body.slice(0, 120).replace(/\n/g, ' ')}`);
  }
  console.log('--- emailMessages ---');
  for (const m of ticket.emails) {
    console.log(`${m.createdAt.toISOString()} [${(m as any).direction}] status=${(m as any).deliveryStatus} from=${(m as any).fromAddress} to=${(m as any).toAddress} subj=${m.subject?.slice(0, 60)} msgId=${m.messageId?.slice(0, 60)} inReplyTo=${(m as any).inReplyTo?.slice(0, 60)} replyId=${(m as any).replyId ?? '-'}`);
  }
  // Look for the "Thank you" reply email anywhere
  const thankyou = await prisma.emailMessage.findMany({
    where: { OR: [{ bodyHtml: { contains: 'Thank you' } }, { subject: { contains: 'wifi' } }] },
    select: { id: true, messageId: true, ticketId: true, createdAt: true },
    orderBy: { createdAt: 'desc' }, take: 10,
  });
  console.log('--- recent matching emailMessages (any ticket) ---');
  for (const m of thankyou) console.log(`${m.createdAt.toISOString()} ticket=${m.ticketId} msgId=${m.messageId?.slice(0, 70)}`);
}

main().catch(console.error).finally(() => process.exit(0)());
