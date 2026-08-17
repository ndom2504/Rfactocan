-- Call 1-to-1 control plane (no media). Run once on Neon.
-- Cron (later, same CRON_SECRET as expire-payments):
--   app/api/cron/expire-calls/route.ts → markMissedRingingCalls()
--   vercel.json: { "path": "/api/cron/expire-calls", "schedule": "* * * * *" }

DO $$ BEGIN
  CREATE TYPE "CallMediaType" AS ENUM ('AUDIO', 'VIDEO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CallStatus" AS ENUM (
    'RINGING',
    'ACCEPTED',
    'REJECTED',
    'MISSED',
    'CANCELED',
    'ENDED',
    'FAILED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Call" (
  "id" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "callerId" TEXT NOT NULL,
  "calleeId" TEXT NOT NULL,
  "mediaType" "CallMediaType" NOT NULL,
  "status" "CallStatus" NOT NULL DEFAULT 'RINGING',
  "livekitRoom" TEXT,
  "startedAt" TIMESTAMP(3),
  "answeredAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "endReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Call_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Call_calleeId_status_idx"
  ON "Call" ("calleeId", "status");

CREATE INDEX IF NOT EXISTS "Call_callerId_status_idx"
  ON "Call" ("callerId", "status");

CREATE INDEX IF NOT EXISTS "Call_threadId_createdAt_idx"
  ON "Call" ("threadId", "createdAt");

CREATE INDEX IF NOT EXISTS "Call_callerId_createdAt_idx"
  ON "Call" ("callerId", "createdAt");

CREATE INDEX IF NOT EXISTS "Call_calleeId_createdAt_idx"
  ON "Call" ("calleeId", "createdAt");

CREATE INDEX IF NOT EXISTS "Call_status_createdAt_idx"
  ON "Call" ("status", "createdAt");

DO $$ BEGIN
  ALTER TABLE "Call"
    ADD CONSTRAINT "Call_threadId_fkey"
    FOREIGN KEY ("threadId") REFERENCES "DirectThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Call"
    ADD CONSTRAINT "Call_callerId_fkey"
    FOREIGN KEY ("callerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Call"
    ADD CONSTRAINT "Call_calleeId_fkey"
    FOREIGN KEY ("calleeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
