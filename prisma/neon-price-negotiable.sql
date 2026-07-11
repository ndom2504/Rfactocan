-- Negotiable trip pricing + sender counter-offers
ALTER TABLE "Trip"
  ADD COLUMN IF NOT EXISTS "priceNegotiable" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "offeredPricePerKg" DOUBLE PRECISION;
