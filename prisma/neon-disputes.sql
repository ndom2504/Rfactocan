-- Disputes / litiges liés aux réservations (run in Neon SQL Editor)

DO $$ BEGIN
  CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Dispute" (
  id TEXT PRIMARY KEY,
  "bookingId" TEXT NOT NULL,
  "openedById" TEXT NOT NULL,
  "againstUserId" TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status "DisputeStatus" NOT NULL DEFAULT 'OPEN',
  "adminNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS "Dispute_bookingId_createdAt_idx"
  ON "Dispute"("bookingId", "createdAt");

CREATE INDEX IF NOT EXISTS "Dispute_status_idx"
  ON "Dispute"(status);

CREATE INDEX IF NOT EXISTS "Dispute_openedById_idx"
  ON "Dispute"("openedById");

DO $$ BEGIN
  ALTER TABLE "Dispute"
    ADD CONSTRAINT "Dispute_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "Booking"(id) ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Dispute"
    ADD CONSTRAINT "Dispute_openedById_fkey"
    FOREIGN KEY ("openedById") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Dispute"
    ADD CONSTRAINT "Dispute_againstUserId_fkey"
    FOREIGN KEY ("againstUserId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
