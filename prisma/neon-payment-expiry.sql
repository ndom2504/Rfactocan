-- Payment window 24h + admin cancel reasons
ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "paymentExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancelledReason" TEXT,
  ADD COLUMN IF NOT EXISTS "cancelledById" TEXT;

CREATE INDEX IF NOT EXISTS "Booking_paymentExpiresAt_idx" ON "Booking"("paymentExpiresAt");
