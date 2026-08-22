-- Gabon SMS OTP login. Run once on Neon.
-- Unique phone (NULLs allowed). Duplicate non-null phones must be cleaned first.

CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");

CREATE TABLE IF NOT EXISTS "PhoneOtp" (
  "id" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT,
  CONSTRAINT "PhoneOtp_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PhoneOtp_phone_createdAt_idx"
  ON "PhoneOtp"("phone", "createdAt");

DO $$ BEGIN
  ALTER TABLE "PhoneOtp" ADD CONSTRAINT "PhoneOtp_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Older table used consumedAt; Prisma / this file use usedAt.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'PhoneOtp' AND column_name = 'consumedAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'PhoneOtp' AND column_name = 'usedAt'
  ) THEN
    ALTER TABLE "PhoneOtp" RENAME COLUMN "consumedAt" TO "usedAt";
  END IF;
END $$;

ALTER TABLE "PhoneOtp" ADD COLUMN IF NOT EXISTS "usedAt" TIMESTAMP(3);
