-- Typing indicator on direct threads. Run once on Neon.

ALTER TABLE "DirectThread"
  ADD COLUMN IF NOT EXISTS "typingUserId" TEXT;

ALTER TABLE "DirectThread"
  ADD COLUMN IF NOT EXISTS "typingAt" TIMESTAMP(3);
