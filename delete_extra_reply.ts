import { PrismaClient } from './server/src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: 'postgresql://postgres:230023107062@localhost:5432/helpdesk?schema=public' })
});

async function main() {
  const replyId = 'ee9e6967-691c-499b-9c55-8f54c1c1407c';

  await prisma.reply.delete({
    where: { id: replyId }
  });

  console.log(`Deleted extra reply with ID: ${replyId}`);

  // Verify we now have exactly 10 seeded replies
  const replies = await prisma.reply.findMany({
    where: { ticketId: '10' }
  });

  const seededReplies = replies.filter(r => r.body.includes('--- [SEED:HELPDESK:REPLY-BATCH-10] ---'));
  console.log(`Total replies for ticket 10: ${replies.length}`);
  console.log(`Seeded replies (with marker): ${seededReplies.length}`);

  if (seededReplies.length === 10) {
    console.log('✅ Successfully have exactly 10 seeded replies.');
  } else {
    console.log(`⚠️ Expected 10 seeded replies, found ${seededReplies.length}.`);
  }
}

main()
  .catch(e => {
    console.error('Error deleting extra reply:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });