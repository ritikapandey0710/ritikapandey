import { prisma } from './src/lib/prisma';

async function main() {
  const tickets = await prisma.ticket.findMany({
    orderBy: { createdAt: 'desc' },
    take: 40,
    select: { title: true, status: true, createdAt: true },
  });
  tickets.forEach(t => console.log(t.createdAt.toISOString(), t.status, t.title));
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });