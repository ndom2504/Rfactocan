-- Product offers (seller offers a product in DM; buyer accepts / refuses / counters). Run once on Neon.

DO $$ BEGIN
  CREATE TYPE "ProductOfferStatus" AS ENUM (
    'PENDING',
    'COUNTERED',
    'ACCEPTED',
    'REFUSED',
    'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ProductOffer" (
  "id" TEXT NOT NULL,
  "threadId" TEXT,
  "sellerId" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "photoUrl" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "priceCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'cad',
  "status" "ProductOfferStatus" NOT NULL DEFAULT 'PENDING',
  "proposedPriceCents" INTEGER,
  "proposedById" TEXT,
  "proposedNote" TEXT NOT NULL DEFAULT '',
  "paymentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductOffer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProductOffer_threadId_idx"
  ON "ProductOffer"("threadId");
CREATE INDEX IF NOT EXISTS "ProductOffer_sellerId_createdAt_idx"
  ON "ProductOffer"("sellerId", "createdAt");
CREATE INDEX IF NOT EXISTS "ProductOffer_buyerId_createdAt_idx"
  ON "ProductOffer"("buyerId", "createdAt");
CREATE INDEX IF NOT EXISTS "ProductOffer_status_idx"
  ON "ProductOffer"("status");

DO $$ BEGIN
  ALTER TABLE "ProductOffer"
    ADD CONSTRAINT "ProductOffer_sellerId_fkey"
    FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProductOffer"
    ADD CONSTRAINT "ProductOffer_buyerId_fkey"
    FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ProductOfferProposal" (
  "id" TEXT NOT NULL,
  "offerId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "priceCents" INTEGER NOT NULL,
  "note" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductOfferProposal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProductOfferProposal_offerId_createdAt_idx"
  ON "ProductOfferProposal"("offerId", "createdAt");
