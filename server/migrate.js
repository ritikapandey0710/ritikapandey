const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  try {
    // Create enum type if not exists
    await prisma.$executeRaw`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TicketCategory') THEN
          CREATE TYPE "TicketCategory" AS ENUM ('GENERAL_QUESTION', 'TECHNICAL_QUESTION', 'REFUND_REQUEST');
        END IF;
      END $$;
    `;
    console.log('Ensured enum TicketCategory exists');

    // Add category column
    await prisma.$executeRaw`
      ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "category" "TicketCategory";
    `;
    console.log('Added column category');

    // Add senderName column
    await prisma.$executeRaw`
      ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "senderName" TEXT NOT NULL;
    `;
    console.log('Added column senderName');

    // Add senderEmail column
    await prisma.$executeRaw`
      ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "senderEmail" TEXT NOT NULL;
    `;
    console.log('Added column senderEmail');

  } catch (e) {
    console.error('Error applying migration:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { main };
