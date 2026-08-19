-- AlterEnum
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'NEW';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';

-- Update existing tickets that might have null status to OPEN (for safety)
UPDATE "Ticket" SET "status" = 'OPEN' WHERE "status" IS NULL;