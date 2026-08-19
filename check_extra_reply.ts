import { PrismaClient } from './server/src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: 'postgresql://postgres:230023107062@localhost:5432/helpdesk?schema=public' })
});

async function main() {
  const replyId = 'ee9e6967-691c-499b-9c55-8f54c1c1407c';

  const reply = await prisma.reply.findUnique({
    where: { id: replyId },
    include: {
      author: {
        select: { id: true, name: true, email: true, role: true }
      }
    }
  });

  if (!reply) {
    console.log('Reply not found');
    return;
  }

  console.log('Extra reply details:');
  console.log(`- ID: ${reply.id}`);
  console.log(`- Body: "${reply.body}"`);
  console.log(`- CreatedAt: ${reply.createdAt}`);
  console.log(`- TicketId: ${reply.ticketId}`);
  console.log(`- Author: ${reply.author?.name} (${reply.author?.email}) - Role: ${reply.author?.role}`);
  console.log(`- Has seed marker: ${reply.body.includes('--- [SEED:HELPDESK:REPLY-BATCH-10] ---')}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });