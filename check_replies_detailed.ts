import { PrismaClient } from './server/src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: 'postgresql://postgres:230023107062@localhost:5432/helpdesk?schema=public' })
});

async function main() {
  const replies = await prisma.reply.findMany({
    where: { ticketId: '10' },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Found ${replies.length} replies for ticket 10:`);
  replies.forEach((reply, index) => {
    console.log(`${index + 1}. Author ID: ${reply.authorId}`);
    console.log(`   Sender Type: ${reply.senderType}`);
    console.log(`   Body length: ${reply.body.length} characters`);
    console.log(`   Created at: ${reply.createdAt}`);
    console.log(`   Has marker: ${reply.body.includes('--- [SEED:HELPDESK:REPLY-BATCH-10] ---')}`);
    console.log('---');
  });

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});