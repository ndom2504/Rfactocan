-- Booking tracker: timeline events + GPS shares (run in Neon SQL Editor)

CREATE TABLE IF NOT EXISTS "BookingEvent" (
  id TEXT PRIMARY KEY,
  "bookingId" TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT,
  label TEXT NOT NULL,
  "metaJson" TEXT NOT NULL DEFAULT '{}',
  "actorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "BookingEvent_bookingId_createdAt_idx"
  ON "BookingEvent"("bookingId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "BookingEvent"
    ADD CONSTRAINT "BookingEvent_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "Booking"(id) ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "BookingLocation" (
  id TEXT PRIMARY KEY,
  "bookingId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  "accuracyM" DOUBLE PRECISION,
  label TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "BookingLocation_bookingId_createdAt_idx"
  ON "BookingLocation"("bookingId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "BookingLocation"
    ADD CONSTRAINT "BookingLocation_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "Booking"(id) ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
