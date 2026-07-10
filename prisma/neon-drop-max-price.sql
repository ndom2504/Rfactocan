-- Remove sender max price from parcel requests (travelers set trip prices only)
-- Run in Neon SQL Editor

ALTER TABLE "ParcelRequest" DROP COLUMN IF EXISTS "maxPricePerKg";
