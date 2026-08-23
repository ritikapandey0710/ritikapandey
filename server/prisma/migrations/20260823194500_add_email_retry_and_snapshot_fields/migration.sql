-- Phase 5: outbound email delivery reliability.
-- Add retry/snapshot fields to EmailMessage so failed outbound emails can be
-- re-sent by the delivery worker without depending on mutable ticket data,
-- and delivery status can be updated from Resend webhooks.

ALTER TABLE "EmailMessage" ADD COLUMN "toAddress" TEXT;
ALTER TABLE "EmailMessage" ADD COLUMN "subject" TEXT;
ALTER TABLE "EmailMessage" ADD COLUMN "bodyHtml" TEXT;
ALTER TABLE "EmailMessage" ADD COLUMN "nextRetryAt" TIMESTAMP(3);
ALTER TABLE "EmailMessage" ADD COLUMN "lastAttemptAt" TIMESTAMP(3);

CREATE INDEX "EmailMessage_direction_deliveryStatus_nextRetryAt_idx"
  ON "EmailMessage"("direction", "deliveryStatus", "nextRetryAt");