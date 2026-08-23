-- Normalize Ticket.resolvedAt precision to match Prisma's TIMESTAMP(3)
-- expectation. No-op on databases where the column is already TIMESTAMP(3)
-- (which includes the current live database); repairs fresh replays/shadow DBs
-- where 20260820090300_add_ai_resolution_fields created the column as bare
-- TIMESTAMP (precision 6).

ALTER TABLE "Ticket" ALTER COLUMN "resolvedAt" TYPE TIMESTAMP(3);