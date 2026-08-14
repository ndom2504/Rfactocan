-- Service invoices: processing duration + hold funds until delivery confirmation.

ALTER TYPE "ServicePayStatus" ADD VALUE IF NOT EXISTS 'DELIVERED';
ALTER TYPE "ServicePayStatus" ADD VALUE IF NOT EXISTS 'FULFILLED';

ALTER TABLE "ServicePaymentRequest"
  ADD COLUMN IF NOT EXISTS "processingDays" INTEGER NOT NULL DEFAULT 3;

ALTER TABLE "ServicePaymentRequest"
  ADD COLUMN IF NOT EXISTS "escrowUntilConfirm" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ServicePaymentRequest"
  ADD COLUMN IF NOT EXISTS "processingDueAt" TIMESTAMP(3);

ALTER TABLE "ServicePaymentRequest"
  ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);

ALTER TABLE "ServicePaymentRequest"
  ADD COLUMN IF NOT EXISTS "clientConfirmedAt" TIMESTAMP(3);

ALTER TABLE "ServicePaymentRequest"
  ADD COLUMN IF NOT EXISTS "stripeTransferId" TEXT;

ALTER TABLE "ServicePaymentRequest"
  ADD COLUMN IF NOT EXISTS "releasedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "ServicePaymentRequest_stripeTransferId_key"
  ON "ServicePaymentRequest"("stripeTransferId");
