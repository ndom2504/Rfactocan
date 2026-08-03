-- Multi-type client orders (colis | service | produit)
-- Run on Neon if not using prisma db push.

DO $$ BEGIN
  CREATE TYPE "OrderNeedType" AS ENUM ('PARCEL', 'SERVICE', 'PRODUCT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "ParcelRequest"
  ADD COLUMN IF NOT EXISTS "needType" "OrderNeedType" NOT NULL DEFAULT 'PARCEL',
  ADD COLUMN IF NOT EXISTS "orderSide" TEXT,
  ADD COLUMN IF NOT EXISTS "serviceCategory" TEXT,
  ADD COLUMN IF NOT EXISTS "serviceType" TEXT,
  ADD COLUMN IF NOT EXISTS "productCategory" TEXT;

-- Allow 0 kg for non-parcel needs (existing rows keep weight).
ALTER TABLE "ParcelRequest" ALTER COLUMN "weightKg" SET DEFAULT 0;

CREATE INDEX IF NOT EXISTS "ParcelRequest_needType_status_idx"
  ON "ParcelRequest" ("needType", "status");
CREATE INDEX IF NOT EXISTS "ParcelRequest_serviceCategory_idx"
  ON "ParcelRequest" ("serviceCategory");
CREATE INDEX IF NOT EXISTS "ParcelRequest_productCategory_idx"
  ON "ParcelRequest" ("productCategory");
