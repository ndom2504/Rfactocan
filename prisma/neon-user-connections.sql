-- User connections (“Connecter” = follow / subscription)
CREATE TABLE IF NOT EXISTS "UserConnection" (
  "id" TEXT NOT NULL,
  "followerId" TEXT NOT NULL,
  "followingId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserConnection_followerId_followingId_key"
  ON "UserConnection"("followerId", "followingId");

CREATE INDEX IF NOT EXISTS "UserConnection_followingId_idx" ON "UserConnection"("followingId");
CREATE INDEX IF NOT EXISTS "UserConnection_followerId_idx" ON "UserConnection"("followerId");

DO $$ BEGIN
  ALTER TABLE "UserConnection"
    ADD CONSTRAINT "UserConnection_followerId_fkey"
    FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "UserConnection"
    ADD CONSTRAINT "UserConnection_followingId_fkey"
    FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
