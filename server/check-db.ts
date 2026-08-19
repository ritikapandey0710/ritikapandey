import { prisma } from './src/lib/prisma';

async function main() {
  const userCount = await prisma.user.count();
  const ticketCount = await prisma.ticket.count();
  const agents = await prisma.user.findMany({ where: { role: 'AGENT' } });
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
  console.log('Users:', userCount);
  console.log('Tickets:', ticketCount);
  console.log('Agents:');
  agents.forEach(u => console.log(`  id=${u.id} name=${u.name} email=${u.email} role=${u.role}`));
  console.log('Admins:');
  admins.forEach(u => console.log(`  id=${u.id} name=${u.name} email=${u.email} role=${u.role}`));
  const byStatus = await prisma.ticket.groupBy({ by: ['status'], _count: true });
  console.log('Tickets by status:', JSON.stringify(byStatus));
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
