CREATE TABLE IF NOT EXISTS "ServiceListing" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "serviceType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "country" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "priceAmount" DOUBLE PRECISION,
  "priceUnit" TEXT NOT NULL DEFAULT 'forfait',
  "currency" TEXT NOT NULL DEFAULT 'CAD',
  "availableFrom" TIMESTAMP(3),
  "availableTo" TIMESTAMP(3),
  "photosJson" TEXT NOT NULL DEFAULT '[]',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceListing_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ServiceListing_category_country_city_idx"
  ON "ServiceListing"("category", "country", "city");
CREATE INDEX IF NOT EXISTS "ServiceListing_serviceType_idx"
  ON "ServiceListing"("serviceType");
CREATE INDEX IF NOT EXISTS "ServiceListing_userId_idx"
  ON "ServiceListing"("userId");
CREATE INDEX IF NOT EXISTS "ServiceListing_status_idx"
  ON "ServiceListing"("status");

DO $$ BEGIN
  ALTER TABLE "ServiceListing" ADD CONSTRAINT "ServiceListing_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
