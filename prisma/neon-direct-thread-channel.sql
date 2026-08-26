-- Sépare In (communauté) et la messagerie services : un fil par couple ET par canal.
ALTER TABLE "DirectThread"
  ADD COLUMN IF NOT EXISTS "channel" TEXT NOT NULL DEFAULT 'APP';

UPDATE "DirectThread"
SET "channel" = 'IN'
WHERE "lastContextType" = 'IN';

DROP INDEX IF EXISTS "DirectThread_userLowId_userHighId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "DirectThread_userLowId_userHighId_channel_key"
  ON "DirectThread" ("userLowId", "userHighId", "channel");

CREATE INDEX IF NOT EXISTS "DirectThread_channel_idx"
  ON "DirectThread" ("channel");
