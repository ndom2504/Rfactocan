-- Shop profile logo (circular bubble on storefront)
ALTER TABLE "Shop"
  ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
