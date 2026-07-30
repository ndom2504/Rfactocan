-- Electronics product fields: warranty, stock, highlights
ALTER TABLE "ShopProduct"
  ADD COLUMN IF NOT EXISTS "warranty" TEXT;

ALTER TABLE "ShopProduct"
  ADD COLUMN IF NOT EXISTS "stockQty" INTEGER;

ALTER TABLE "ShopProduct"
  ADD COLUMN IF NOT EXISTS "highlights" TEXT;
