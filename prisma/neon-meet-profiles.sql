-- Rencontre privée: MeetProfile + MeetContact
-- Run on Neon / production if prisma migrate is not applied yet.

DO $$ BEGIN
  CREATE TYPE "MeetKind" AS ENUM ('BUSINESS', 'ROMANCE');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "MeetGender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "MeetContactStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "MeetProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" "MeetKind" NOT NULL,
  "headline" TEXT NOT NULL,
  "bio" TEXT,
  "myGender" "MeetGender" NOT NULL DEFAULT 'UNSPECIFIED',
  "birthYear" INTEGER,
  "city" TEXT,
  "country" TEXT,
  "seekGender" "MeetGender" NOT NULL DEFAULT 'UNSPECIFIED',
  "ageMin" INTEGER,
  "ageMax" INTEGER,
  "interests" TEXT,
  "photoUrl" TEXT,
  "photoVisible" BOOLEAN NOT NULL DEFAULT true,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MeetProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MeetProfile_userId_key" ON "MeetProfile"("userId");
CREATE INDEX IF NOT EXISTS "MeetProfile_kind_active_updatedAt_idx" ON "MeetProfile"("kind", "active", "updatedAt");
CREATE INDEX IF NOT EXISTS "MeetProfile_country_city_idx" ON "MeetProfile"("country", "city");

DO $$ BEGIN
  ALTER TABLE "MeetProfile"
    ADD CONSTRAINT "MeetProfile_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "MeetContact" (
  "id" TEXT NOT NULL,
  "fromUserId" TEXT NOT NULL,
  "toUserId" TEXT NOT NULL,
  "message" TEXT,
  "status" "MeetContactStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MeetContact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MeetContact_fromUserId_toUserId_key" ON "MeetContact"("fromUserId", "toUserId");
CREATE INDEX IF NOT EXISTS "MeetContact_toUserId_status_idx" ON "MeetContact"("toUserId", "status");
CREATE INDEX IF NOT EXISTS "MeetContact_fromUserId_status_idx" ON "MeetContact"("fromUserId", "status");

DO $$ BEGIN
  ALTER TABLE "MeetContact"
    ADD CONSTRAINT "MeetContact_fromUserId_fkey"
    FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "MeetContact"
    ADD CONSTRAINT "MeetContact_toUserId_fkey"
    FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
