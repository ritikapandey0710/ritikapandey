import { PrismaClient } from './src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ticketdb?schema=public';

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    await prisma.$executeRaw`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TicketCategory') THEN
          CREATE TYPE "TicketCategory" AS ENUM ('GENERAL_QUESTION', 'TECHNICAL_QUESTION', 'REFUND_REQUEST');
        END IF;
      END $$;
    `;
    console.log('Ensured enum TicketCategory exists');

    await prisma.$executeRaw`
      ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "category" "TicketCategory";
    `;
    console.log('Added column category');

    await prisma.$executeRaw`
      ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "senderName" TEXT NOT NULL;
    `;
    console.log('Added column senderName');

    await prisma.$executeRaw`
      ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "senderEmail" TEXT NOT NULL;
    `;
    console.log('Added column senderEmail');

    await prisma.$executeRaw`
      ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "ticketNumber" SERIAL;
    `;
    console.log('Added column ticketNumber');

    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "Ticket_ticketNumber_key" ON "Ticket"("ticketNumber");
    `;
    console.log('Added unique index on ticketNumber');
  } catch (e) {
    console.error('Error applying migration:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();