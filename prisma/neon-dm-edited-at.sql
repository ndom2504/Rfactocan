-- Allow editing unread DMs. Run once on Neon.
ALTER TABLE "DirectMessage" ADD COLUMN IF NOT EXISTS "editedAt" TIMESTAMP(3);
