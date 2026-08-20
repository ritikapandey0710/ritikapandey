-- Add AI-resolution tracking fields to the Ticket model.
-- These fields record when a ticket was resolved by the existing
-- knowledge-base auto-resolution flow and enable the professional
-- dashboard metrics (AI-resolved count % and average resolution time).
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP;
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "resolvedByAI" BOOLEAN NOT NULL DEFAULT false;

-- Indexes for dashboard query performance
CREATE INDEX IF NOT EXISTS "Ticket_resolvedByAI_idx" ON "Ticket" ("resolvedByAI");
CREATE INDEX IF NOT EXISTS "Ticket_resolvedAt_idx" ON "Ticket" ("resolvedAt");
