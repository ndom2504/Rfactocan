-- Profile banner + publication charter + community post reports
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bannerUrl" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "publicationCharterAcceptedAt" TIMESTAMP(3);

ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "communityPostId" TEXT;

CREATE INDEX IF NOT EXISTS "Report_communityPostId_idx" ON "Report"("communityPostId");

DO $$ BEGIN
  ALTER TABLE "Report"
    ADD CONSTRAINT "Report_communityPostId_fkey"
    FOREIGN KEY ("communityPostId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
