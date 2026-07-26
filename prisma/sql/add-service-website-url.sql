-- Optional website / page URL for service listings.
ALTER TABLE "ServiceListing"
ADD COLUMN IF NOT EXISTS "websiteUrl" TEXT;
