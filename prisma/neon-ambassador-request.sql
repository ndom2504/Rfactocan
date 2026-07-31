-- Ambassador self-request (WhatsApp for admin contact)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AmbassadorRequestStatus') THEN
    CREATE TYPE "AmbassadorRequestStatus" AS ENUM ('NONE', 'PENDING', 'REJECTED');
  END IF;
END $$;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "ambassadorRequestStatus" "AmbassadorRequestStatus" NOT NULL DEFAULT 'NONE';

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "ambassadorWhatsapp" TEXT;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "ambassadorRequestedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "User_ambassadorRequestStatus_idx"
  ON "User"("ambassadorRequestStatus");
