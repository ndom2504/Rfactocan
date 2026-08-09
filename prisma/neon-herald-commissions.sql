-- Herald (Héraut Réseau) commission ledger + payouts
-- Barème défaut produit : 10 % des frais plateforme (AMBASSADOR_REWARD_BPS=1000)

DO $$ BEGIN
  CREATE TYPE "HeraldCommissionSource" AS ENUM ('BOOKING', 'SERVICE', 'SHOP');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "HeraldCommissionStatus" AS ENUM ('ACCRUED', 'HELD', 'REVERSED', 'PAID', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "HeraldPayout" (
  "id" TEXT NOT NULL,
  "heraldId" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'cad',
  "stripeTransferId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PAID',
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HeraldPayout_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "HeraldPayout_stripeTransferId_key"
  ON "HeraldPayout"("stripeTransferId");
CREATE INDEX IF NOT EXISTS "HeraldPayout_heraldId_createdAt_idx"
  ON "HeraldPayout"("heraldId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "HeraldPayout"
    ADD CONSTRAINT "HeraldPayout_heraldId_fkey"
    FOREIGN KEY ("heraldId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "HeraldCommission" (
  "id" TEXT NOT NULL,
  "heraldId" TEXT NOT NULL,
  "referralUserId" TEXT NOT NULL,
  "sourceType" "HeraldCommissionSource" NOT NULL,
  "sourceId" TEXT NOT NULL,
  "platformFeeCents" INTEGER NOT NULL,
  "rewardBps" INTEGER NOT NULL,
  "rewardCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'cad',
  "status" "HeraldCommissionStatus" NOT NULL DEFAULT 'ACCRUED',
  "stripeTransferId" TEXT,
  "payoutId" TEXT,
  "paidAt" TIMESTAMP(3),
  "reversedAt" TIMESTAMP(3),
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HeraldCommission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "HeraldCommission_sourceType_sourceId_heraldId_key"
  ON "HeraldCommission"("sourceType", "sourceId", "heraldId");
CREATE INDEX IF NOT EXISTS "HeraldCommission_heraldId_status_idx"
  ON "HeraldCommission"("heraldId", "status");
CREATE INDEX IF NOT EXISTS "HeraldCommission_referralUserId_idx"
  ON "HeraldCommission"("referralUserId");
CREATE INDEX IF NOT EXISTS "HeraldCommission_status_createdAt_idx"
  ON "HeraldCommission"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "HeraldCommission_payoutId_idx"
  ON "HeraldCommission"("payoutId");

DO $$ BEGIN
  ALTER TABLE "HeraldCommission"
    ADD CONSTRAINT "HeraldCommission_heraldId_fkey"
    FOREIGN KEY ("heraldId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "HeraldCommission"
    ADD CONSTRAINT "HeraldCommission_referralUserId_fkey"
    FOREIGN KEY ("referralUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "HeraldCommission"
    ADD CONSTRAINT "HeraldCommission_payoutId_fkey"
    FOREIGN KEY ("payoutId") REFERENCES "HeraldPayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
