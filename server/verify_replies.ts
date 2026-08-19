import { PrismaClient } from './src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: 'postgresql://postgres:230023107062@localhost:5432/helpdesk?schema=public' })
});

const SEED_MARKER = '--- [SEED:HELPDESK:REPLY-BATCH-10] ---';

async function main() {
  const replies = await prisma.reply.findMany({
    where: { ticketId: '10' },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Found ${replies.length} replies for ticket 10\n`);

  let allHaveAtLeast10Lines = true;
  let allAlternating = true;
  let previousAuthorId = null;

  for (let i = 0; i < replies.length; i++) {
    const reply = replies[i];
    // Count non-empty lines
    const lines = reply.body.split('\n').filter(line => line.trim() !== '');
    const lineCount = lines.length;

    console.log(`Reply ${i + 1}:`);
    console.log(`  Author ID: ${reply.authorId}`);
    console.log(`  Lines: ${lineCount}`);
    console.log(`  Created: ${reply.createdAt}`);

    // Check if has at least 10 lines
    if (lineCount < 10) {
      console.log(`  ❌ FAIL: Less than 10 lines (${lineCount})`);
      allHaveAtLeast10Lines = false;
    } else {
      console.log(`  ✅ PASS: At least 10 lines (${lineCount})`);
    }

    // Check alternating pattern (customer, agent, customer, agent...)
    // We'll just check that consecutive replies have different authors
    if (previousAuthorId !== null && reply.authorId === previousAuthorId) {
      console.log(`  ❌ FAIL: Same author as previous reply`);
      allAlternating = false;
    } else {
      console.log(`  ✅ PASS: Different author from previous`);
    }

    previousAuthorId = reply.authorId;

    // Show first and last line as sample
    if (lines.length > 0) {
      console.log(`  First line: "${lines[0].substring(0, 50)}${lines[0].length > 50 ? '...' : ''}"`);
      console.log(`  Last line: "${lines[lines.length - 1].substring(0, 50)}${lines[lines.length - 1].length > 50 ? '...' : ''}"`);
    }
    console.log('');
  }

  console.log('=== SUMMARY ===');
  console.log(`Total replies: ${replies.length}`);
  console.log(`All have ≥10 lines: ${allHaveAtLeast10Lines ? '✅ YES' : '❌ NO'}`);
  console.log(`Alternating properly: ${allAlternating ? '✅ YES' : '❌ NO'}`);

  // Get user info for the authors
  const authorIds = [...new Set(replies.map(r => r.authorId))];
  const users = await prisma.user.findMany({
    where: { id: { in: authorIds } }
  });

  console.log(`\\nUsers involved:`);
  users.forEach(user => {
    const replyCount = replies.filter(r => r.authorId === user.id).length;
    console.log(`  ${user.email} (${user.role}): ${replyCount} replies`);
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