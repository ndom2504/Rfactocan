-- Portefeuille : canaux retrait (mobile money / banque) + demandes de retrait

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "payoutChannel" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "payoutProvider" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "payoutIdentifier" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "payoutBankName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "payoutBankHolder" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "payoutBankAccount" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "payoutBankIban" TEXT;

DO $$ BEGIN
  CREATE TYPE "WalletWithdrawalStatus" AS ENUM (
    'REQUESTED', 'APPROVED', 'SENT', 'FAILED', 'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "WalletWithdrawalSource" AS ENUM (
    'HERALD_COMMISSIONS', 'EARNINGS', 'MANUAL'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "WalletWithdrawal" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'cad',
  "status" "WalletWithdrawalStatus" NOT NULL DEFAULT 'REQUESTED',
  "source" "WalletWithdrawalSource" NOT NULL DEFAULT 'HERALD_COMMISSIONS',
  "channel" TEXT NOT NULL,
  "provider" TEXT,
  "destinationHint" TEXT NOT NULL,
  "bankName" TEXT,
  "bankHolder" TEXT,
  "bankAccount" TEXT,
  "bankIban" TEXT,
  "note" TEXT,
  "adminNote" TEXT,
  "processedById" TEXT,
  "processedAt" TIMESTAMP(3),
  "heraldPayoutId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WalletWithdrawal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "WalletWithdrawal_userId_status_idx"
  ON "WalletWithdrawal"("userId", "status");
CREATE INDEX IF NOT EXISTS "WalletWithdrawal_status_createdAt_idx"
  ON "WalletWithdrawal"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "WalletWithdrawal_source_idx"
  ON "WalletWithdrawal"("source");

DO $$ BEGIN
  ALTER TABLE "WalletWithdrawal"
    ADD CONSTRAINT "WalletWithdrawal_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
