-- Records changes that were previously applied directly to the live database
-- but were never captured in migration history:
--   1. Role enum gained the 'USER' value
--   2. user.role default changed from 'AGENT' to 'USER'
--   3. Ticket.senderEmail was set NOT NULL
--   4. Ticket.senderName was set NOT NULL
--
-- All statements are idempotent-safe and data-preserving.
-- Note: ALTER TYPE ... ADD VALUE is transaction-compatible on PostgreSQL 12+
-- as long as the new value is not referenced earlier in the same transaction.
-- These statements do not reference 'USER', so they are safe under Prisma's
-- per-migration transaction wrapper.

-- AlterEnum: add Role.USER
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'USER';

-- AlterTable: change default of user.role to USER
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'USER';

-- AlterTable: enforce NOT NULL on Ticket.senderEmail
ALTER TABLE "Ticket" ALTER COLUMN "senderEmail" SET NOT NULL;

-- AlterTable: enforce NOT NULL on Ticket.senderName
ALTER TABLE "Ticket" ALTER COLUMN "senderName" SET NOT NULL;