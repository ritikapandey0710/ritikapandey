-- This migration reconciles schema drift that existed in the database
-- but was not captured in migration history.
--
-- The following changes were already applied directly to the database:
--   - TicketCategory enum
--   - Ticket.category column
--   - Ticket.senderName column
--   - Ticket.senderEmail column
--   - Ticket.senderEmail index
--
-- This migration is marked as applied via `prisma migrate resolve --applied`
-- because the changes already exist in the database.

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('GENERAL_QUESTION', 'TECHNICAL_QUESTION', 'REFUND_REQUEST');

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN "category" "TicketCategory",
ADD COLUMN "senderEmail" TEXT,
ADD COLUMN "senderName" TEXT;