-- Manual ID document upload (fallback when Stripe Identity fails)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'ManualIdDocStatus'
  ) THEN
    CREATE TYPE "ManualIdDocStatus" AS ENUM (
      'NONE',
      'SUBMITTED',
      'APPROVED',
      'REJECTED'
    );
  END IF;
END $$;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "manualIdDocUrl" TEXT;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "manualIdDocStatus" "ManualIdDocStatus" NOT NULL DEFAULT 'NONE';

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "manualIdDocUploadedAt" TIMESTAMP(3);

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "manualIdDocNote" TEXT;

CREATE INDEX IF NOT EXISTS "User_manualIdDocStatus_idx"
  ON "User"("manualIdDocStatus");
