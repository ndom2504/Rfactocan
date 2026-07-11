-- Presence + message read receipts
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3);

ALTER TABLE "Message"
  ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Message_bookingId_readAt_idx"
  ON "Message"("bookingId", "readAt");
