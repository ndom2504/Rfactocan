-- Who initiated the booking proposal (run in Neon SQL Editor)
-- SENDER = expéditeur propose un voyageur
-- TRAVELER = voyageur postule sur une demande

ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "proposedBy" TEXT NOT NULL DEFAULT 'SENDER';
