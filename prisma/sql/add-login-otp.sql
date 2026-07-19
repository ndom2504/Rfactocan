CREATE TABLE IF NOT EXISTS "LoginOtp" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoginOtp_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LoginOtp_userId_createdAt_idx" ON "LoginOtp"("userId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "LoginOtp" ADD CONSTRAINT "LoginOtp_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
