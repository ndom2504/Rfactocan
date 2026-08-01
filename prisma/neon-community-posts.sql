-- Community feed posts (business / opportunity / community)
DO $$ BEGIN
  CREATE TYPE "CommunityPostKind" AS ENUM ('BUSINESS', 'OPPORTUNITY', 'COMMUNITY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CommunityPostStatus" AS ENUM ('OPEN', 'HIDDEN', 'REMOVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "CommunityPost" (
  "id" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "kind" "CommunityPostKind" NOT NULL,
  "title" TEXT,
  "body" TEXT NOT NULL,
  "attachmentsJson" TEXT NOT NULL DEFAULT '[]',
  "status" "CommunityPostStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunityPost_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "CommunityPost"
    ADD CONSTRAINT "CommunityPost_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "CommunityPost_createdAt_idx" ON "CommunityPost"("createdAt");
CREATE INDEX IF NOT EXISTS "CommunityPost_kind_createdAt_idx" ON "CommunityPost"("kind", "createdAt");
CREATE INDEX IF NOT EXISTS "CommunityPost_authorId_createdAt_idx" ON "CommunityPost"("authorId", "createdAt");
CREATE INDEX IF NOT EXISTS "CommunityPost_status_createdAt_idx" ON "CommunityPost"("status", "createdAt");
