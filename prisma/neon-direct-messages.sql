-- Direct messages for services & jobs (verified users). Run once on Neon.

CREATE TABLE IF NOT EXISTS "DirectThread" (
  "id" TEXT NOT NULL,
  "userLowId" TEXT NOT NULL,
  "userHighId" TEXT NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'APP',
  "lastContextType" TEXT,
  "lastContextId" TEXT,
  "lastMessageAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DirectThread_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DirectThread_userLowId_userHighId_channel_key"
  ON "DirectThread" ("userLowId", "userHighId", "channel");

CREATE INDEX IF NOT EXISTS "DirectThread_lastMessageAt_idx"
  ON "DirectThread" ("lastMessageAt");

CREATE INDEX IF NOT EXISTS "DirectThread_userLowId_idx"
  ON "DirectThread" ("userLowId");

CREATE INDEX IF NOT EXISTS "DirectThread_userHighId_idx"
  ON "DirectThread" ("userHighId");

CREATE INDEX IF NOT EXISTS "DirectThread_channel_idx"
  ON "DirectThread" ("channel");

CREATE TABLE IF NOT EXISTS "DirectMessage" (
  "id" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "attachmentUrl" TEXT,
  "contextType" TEXT,
  "contextId" TEXT,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DirectMessage_threadId_createdAt_idx"
  ON "DirectMessage" ("threadId", "createdAt");

CREATE INDEX IF NOT EXISTS "DirectMessage_threadId_readAt_idx"
  ON "DirectMessage" ("threadId", "readAt");

DO $$ BEGIN
  ALTER TABLE "DirectThread"
    ADD CONSTRAINT "DirectThread_userLowId_fkey"
    FOREIGN KEY ("userLowId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "DirectThread"
    ADD CONSTRAINT "DirectThread_userHighId_fkey"
    FOREIGN KEY ("userHighId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "DirectMessage"
    ADD CONSTRAINT "DirectMessage_threadId_fkey"
    FOREIGN KEY ("threadId") REFERENCES "DirectThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "DirectMessage"
    ADD CONSTRAINT "DirectMessage_senderId_fkey"
    FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
