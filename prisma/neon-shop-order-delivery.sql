-- Shop order delivery: destination + mode + linked parcel request
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ShopDeliveryMode') THEN
    CREATE TYPE "ShopDeliveryMode" AS ENUM ('NONE', 'MATCH_ONLY', 'PARCEL_PAID');
  END IF;
END $$;

ALTER TABLE "ShopOrder"
  ADD COLUMN IF NOT EXISTS "deliveryToCountry" TEXT;

ALTER TABLE "ShopOrder"
  ADD COLUMN IF NOT EXISTS "deliveryToCity" TEXT;

ALTER TABLE "ShopOrder"
  ADD COLUMN IF NOT EXISTS "deliveryMode" "ShopDeliveryMode" NOT NULL DEFAULT 'NONE';

ALTER TABLE "ShopOrder"
  ADD COLUMN IF NOT EXISTS "parcelRequestId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "ShopOrder_parcelRequestId_key"
  ON "ShopOrder"("parcelRequestId");

CREATE INDEX IF NOT EXISTS "ShopOrder_deliveryMode_idx"
  ON "ShopOrder"("deliveryMode");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ShopOrder_parcelRequestId_fkey'
  ) THEN
    ALTER TABLE "ShopOrder"
      ADD CONSTRAINT "ShopOrder_parcelRequestId_fkey"
      FOREIGN KEY ("parcelRequestId") REFERENCES "ParcelRequest"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
