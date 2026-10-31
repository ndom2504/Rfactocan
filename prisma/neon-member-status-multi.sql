-- Multi-story (max 10 / user): drop 1:1 unique, add mediaType + viewCount
ALTER TABLE "MemberStatus" DROP CONSTRAINT IF EXISTS "MemberStatus_userId_key";
DROP INDEX IF EXISTS "MemberStatus_userId_key";

ALTER TABLE "MemberStatus" ADD COLUMN IF NOT EXISTS "mediaType" TEXT;
ALTER TABLE "MemberStatus" ADD COLUMN IF NOT EXISTS "viewCount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "MemberStatus_userId_expiresAt_idx"
  ON "MemberStatus"("userId", "expiresAt");
