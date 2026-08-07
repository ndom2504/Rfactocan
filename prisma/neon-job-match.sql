-- Emploi match (Commander) — run once on Neon / Postgres
-- Adds JOB_SEEK / JOB_OFFER need types + job profile fields + JobContact table.

DO $$ BEGIN
  ALTER TYPE "OrderNeedType" ADD VALUE IF NOT EXISTS 'JOB_SEEK';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "OrderNeedType" ADD VALUE IF NOT EXISTS 'JOB_OFFER';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "ParcelRequest"
  ADD COLUMN IF NOT EXISTS "jobTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "jobSector" TEXT,
  ADD COLUMN IF NOT EXISTS "jobExperience" TEXT,
  ADD COLUMN IF NOT EXISTS "jobDiploma" TEXT,
  ADD COLUMN IF NOT EXISTS "jobCvUrl" TEXT;

CREATE INDEX IF NOT EXISTS "ParcelRequest_jobSector_status_idx"
  ON "ParcelRequest" ("jobSector", "status");

CREATE TABLE IF NOT EXISTS "JobContact" (
  "id" TEXT NOT NULL,
  "fromUserId" TEXT NOT NULL,
  "toUserId" TEXT NOT NULL,
  "fromRequestId" TEXT NOT NULL,
  "toRequestId" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SENT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JobContact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "JobContact_fromUserId_toRequestId_key"
  ON "JobContact" ("fromUserId", "toRequestId");

CREATE INDEX IF NOT EXISTS "JobContact_toUserId_createdAt_idx"
  ON "JobContact" ("toUserId", "createdAt");

CREATE INDEX IF NOT EXISTS "JobContact_fromUserId_idx"
  ON "JobContact" ("fromUserId");

DO $$ BEGIN
  ALTER TABLE "JobContact"
    ADD CONSTRAINT "JobContact_fromUserId_fkey"
    FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "JobContact"
    ADD CONSTRAINT "JobContact_toUserId_fkey"
    FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "JobContact"
    ADD CONSTRAINT "JobContact_fromRequestId_fkey"
    FOREIGN KEY ("fromRequestId") REFERENCES "ParcelRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "JobContact"
    ADD CONSTRAINT "JobContact_toRequestId_fkey"
    FOREIGN KEY ("toRequestId") REFERENCES "ParcelRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
