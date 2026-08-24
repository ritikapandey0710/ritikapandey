// READ-ONLY production-state verification. Performs NO writes.
import 'dotenv/config';
import { prisma } from './src/lib/prisma';

async function main() {
  const ai = await prisma.user.findUnique({ where: { email: 'ai@helpdesk.local' } });
  console.log('AI_AGENT:', ai ? `${ai.name} (${ai.role}) id=${ai.id}` : 'MISSING');
  const aiResolved = await prisma.ticket.findMany({
    where: { resolvedByAI: true },
    select: { ticketNumber: true, status: true, assigneeId: true, resolvedAt: true },
    take: 5,
  });
  console.log('AI_RESOLVED_SAMPLES:', JSON.stringify(aiResolved));
  const unresolvedWithAI = await prisma.ticket.count({ where: { resolvedByAI: true, status: { not: 'RESOLVED' } } });
  console.log('RESOLVED_BY_AI_BUT_NOT_RESOLVED_STATUS:', unresolvedWithAI);
  const stats = await prisma.$queryRaw<any[]>`SELECT * FROM get_dashboard_stats()`;
  console.log('DASHBOARD_STATS:', JSON.stringify(stats[0], (_, v) => typeof v === 'bigint' ? Number(v) : v));
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
