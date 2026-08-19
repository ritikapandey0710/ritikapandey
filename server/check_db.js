const { PrismaClient } = require('./src/generated/prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: 'postgresql://postgres:230023107062@localhost:5432/helpdesk?schema=public' })
});

async function main() {
  try {
    const users = await prisma.user.findMany();
    console.log('Users:', users.map(u => ({ id: u.id, email: u.email, role: u.role, name: u.name })));

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
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);