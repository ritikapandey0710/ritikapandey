import { prisma } from './src/lib/prisma';

async function main() {
  // Query the most recent webhook ticket and its replies
  const ticket = await prisma.ticket.findFirst({
    where: { title: 'Password Reset Issues', senderEmail: 'test@example.com' },
    orderBy: { createdAt: 'desc' },
  });
  if (!ticket) {
    console.log('No webhook ticket found');
    return;
  }
  console.log(`Found ticket: ${ticket.id} (status=${ticket.status})`);

  const replies = await prisma.reply.findMany({
    where: { ticketId: ticket.id },
    include: { author: { select: { email: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`Replies for ticket: ${replies.length}`);
  replies.forEach(r => {
    console.log(`  senderType=${r.senderType} | author=${r.author?.email} (${r.author?.name})`);
    console.log(`    body: ${r.body.substring(0, 100)}...`);
  });
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });