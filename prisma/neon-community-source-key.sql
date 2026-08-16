-- Discussion threads for listings injected into the community feed
ALTER TABLE "CommunityPost" ADD COLUMN IF NOT EXISTS "sourceKey" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "CommunityPost_sourceKey_key" ON "CommunityPost"("sourceKey");
