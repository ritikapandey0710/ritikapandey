import { PrismaClient } from './server/src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: 'postgresql://postgres:230023107062@localhost:5432/helpdesk?schema=public' })
});

async function main() {
  const customerUserId = 'LQuIuAoGHj9b1F5xHcQ846xrMAC383aI'; // agent1@example.com now named riya
  const agentUserId = 'JhERvmb6QQkvmwExkoa8CwHvqGLOw8R9'; // agent@example.com

  // Get all replies for ticket 10
  const replies = await prisma.reply.findMany({
    where: { ticketId: '10' },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Found ${replies.length} replies for ticket 10`);

  // Update each reply with correct senderType based on authorId
  for (let i = 0; i < replies.length; i++) {
    const reply = replies[i];
    const isCustomer = reply.authorId === customerUserId;
    const expectedSenderType = isCustomer ? 'CUSTOMER' : 'AGENT';

    if (reply.senderType !== expectedSenderType) {
      await prisma.reply.update({
        where: { id: reply.id },
        data: { senderType: expectedSenderType }
      });
      console.log(`Updated reply ${reply.id}: authorId ${reply.authorId} -> senderType ${expectedSenderType}`);
    } else {
      console.log(`Reply ${reply.id} already has correct senderType: ${reply.senderType}`);
    }
  }

  // Verify
  const updatedReplies = await prisma.reply.findMany({
    where: { ticketId: '10' },
    orderBy: { createdAt: 'asc' },
    select: { id: true, authorId: true, senderType: true }
  });

  console.log('\nVerification:');
  updatedReplies.forEach((r, idx) => {
    console.log(`${idx+1}. ID: ${r.id} | Author: ${r.authorId} | SenderType: ${r.senderType}`);
  });
}

main()
  .catch(e => {
    console.error('Error fixing reply sender types:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });