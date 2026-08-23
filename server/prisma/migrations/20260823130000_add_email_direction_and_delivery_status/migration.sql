-- Add direction/delivery tracking to EmailMessage.
-- All existing rows are inbound-only (Phase 3 semantics), so the new
-- "direction" column defaults to INBOUND and deliveryStatus stays NULL for them.

CREATE TYPE "EmailDirection" AS ENUM ('INBOUND', 'OUTBOUND');

CREATE TYPE "EmailDeliveryStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'BOUNCED', 'FAILED');

ALTER TABLE "EmailMessage"
  ADD COLUMN "direction" "EmailDirection" NOT NULL DEFAULT 'INBOUND',
  ADD COLUMN "deliveryStatus" "EmailDeliveryStatus",
  ADD COLUMN "lastError" TEXT,
  ADD COLUMN "retryCount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "EmailMessage_direction_deliveryStatus_idx" ON "EmailMessage"("direction", "deliveryStatus");