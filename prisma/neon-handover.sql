-- Handover QR fields on Booking (run in Neon SQL Editor)

ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "handoverToken" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "handoverCode" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "handoverExpiresAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "handedOverAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Booking_handoverToken_key"
  ON "Booking"("handoverToken");

CREATE INDEX IF NOT EXISTS "Booking_handoverCode_idx"
  ON "Booking"("handoverCode");
