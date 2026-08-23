import { PrismaClient } from './server/src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Read the database URL from the environment (e.g. loaded from server/.env)
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl })
});

async function main() {
  const ticketCount = await prisma.ticket.count();
  console.log(`Total tickets: ${ticketCount}`);

  const statusCounts = await prisma.ticket.groupBy({
    by: ['status'],
    _count: true,
  });

  console.log('Status distribution:');
  for (const { status, _count } of statusCounts) {
    console.log(`  ${status}: ${_count}`);
  }

  // Also show a few examples of each status
  const statuses = ['NEW', 'PROCESSING', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
  for (const status of statuses) {
    const tickets = await prisma.ticket.findMany({
      where: { status },
      take: 2,
    });
    console.log(`\nSample ${status} tickets:`);
    for (const ticket of tickets) {
      console.log(`  - ${ticket.title} (${ticket.status})`);
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });