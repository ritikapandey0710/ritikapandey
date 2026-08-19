import { PrismaClient } from './server/src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Override the database URL to ensure we use the correct database
process.env.DATABASE_URL = 'postgresql://postgres:230023107062@localhost:5432/helpdesk?schema=public';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl })
});

async function main() {
  await prisma.$executeRaw`ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'NEW';`;
  await prisma.$executeRaw`ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';`;
  console.log('Enum updated');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });