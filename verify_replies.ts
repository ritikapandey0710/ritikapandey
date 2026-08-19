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

  console.log(`Verifying ${replies.length} replies for ticket 10:\n`);

  let allValid = true;

  replies.forEach((reply, index) => {
    const lineCount = reply.body.split('\n').length;
    const hasAtLeast10Lines = lineCount >= 10;

    console.log(`${index + 1}. Author ID: ${reply.authorId}`);
    console.log(`   Line count: ${lineCount} (${hasAtLeast10Lines ? '✓ PASS' : '✗ FAIL'})`);
    console.log(`   Body length: ${reply.body.length} characters`);
    console.log(`   Created at: ${reply.createdAt}`);
    console.log(`   Has marker: ${reply.body.includes('--- [SEED:HELPDESK:REPLY-BATCH-10] ---') ? '✓' : '✗'}`);

    if (!hasAtLeast10Lines) {
      allValid = false;
      console.log(`   Body preview: ${reply.body.substring(0, 200)}...`);
    }
    console.log('---');
  });

  console.log(`\nSummary:`);
  console.log(`- Total replies: ${replies.length}`);
  console.log(`- All replies have at least 10 lines: ${allValid ? '✓ YES' : '✗ NO'}`);

  await prisma.$disconnect();

  return allValid;
}

main().then(success => {
  process.exit(success ? 0 : 1);
}).catch(e => {
  console.error(e);
  process.exit(1);
});