-- Add productsJson for sales listings (sector + product filters).
ALTER TABLE "ServiceListing"
ADD COLUMN IF NOT EXISTS "productsJson" TEXT NOT NULL DEFAULT '[]';
