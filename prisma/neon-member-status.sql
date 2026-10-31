-- Professional 24h statuses (Messages hub)
DO $$ BEGIN
  CREATE TYPE "MemberStatusKind" AS ENUM ('IDEA', 'HELP', 'PROGRESS', 'AVAILABLE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "MemberStatus" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" "MemberStatusKind" NOT NULL,
  "caption" TEXT,
  "mediaUrl" TEXT,
  "mirrored" BOOLEAN NOT NULL DEFAULT false,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MemberStatus_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MemberStatus_userId_key" ON "MemberStatus"("userId");
CREATE INDEX IF NOT EXISTS "MemberStatus_expiresAt_idx" ON "MemberStatus"("expiresAt");
CREATE INDEX IF NOT EXISTS "MemberStatus_kind_expiresAt_idx" ON "MemberStatus"("kind", "expiresAt");

DO $$ BEGIN
  ALTER TABLE "MemberStatus"
    ADD CONSTRAINT "MemberStatus_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
