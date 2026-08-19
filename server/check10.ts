import { PrismaClient } from './src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: 'postgresql://postgres:230023107062@localhost:5432/helpdesk?schema=public' })
});

async function main() {
  const ticket10 = await prisma.ticket.findUnique({
    where: { id: '10' },
    include: { _count: { select: { replies: true } } }
  });
  console.log('Ticket 10:', ticket10 ? {
    id: ticket10.id,
    title: ticket10.title,
    replyCount: ticket10._count ? ticket10._count.replies : 0
  } : 'Not found');

  if (ticket10) {
    const replies = await prisma.reply.findMany({
      where: { ticketId: '10' },
      orderBy: { createdAt: 'asc' }
    });
    console.log('Existing replies for ticket 10:', replies.length);
    replies.forEach((r, i) => {
      console.log(`  Reply ${i+1}: Author ID: ${r.authorId || 'None'} - ${r.createdAt}`);
    });
  }

  // Get users
  const users = await prisma.user.findMany();
  console.log('\\nUsers:');
  users.forEach(u => {
    console.log(`  ID: ${u.id}, Email: ${u.email}, Role: ${u.role}, Name: ${u.name}`);
  });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });