-- Mode de transport multi-modal (avion, mer, rail, route)
DO $$ BEGIN
  CREATE TYPE "TransportMode" AS ENUM ('AIR', 'SEA', 'RAIL', 'ROAD');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Trip"
  ADD COLUMN IF NOT EXISTS "transportMode" "TransportMode" NOT NULL DEFAULT 'AIR';

CREATE INDEX IF NOT EXISTS "Trip_transportMode_idx" ON "Trip"("transportMode");
