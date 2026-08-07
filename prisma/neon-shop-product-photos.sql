-- Multi-photo support for shop products (photosJson; photoUrl stays as cover).
ALTER TABLE "ShopProduct" ADD COLUMN IF NOT EXISTS "photosJson" TEXT NOT NULL DEFAULT '[]';

-- Backfill existing single photoUrl into photosJson when empty.
UPDATE "ShopProduct"
SET "photosJson" = json_build_array("photoUrl")::text
WHERE "photoUrl" IS NOT NULL
  AND "photoUrl" <> ''
  AND ("photosJson" IS NULL OR "photosJson" = '[]' OR "photosJson" = '');
