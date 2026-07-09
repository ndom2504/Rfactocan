-- V2 Payments + KYC (run in Neon SQL Editor)
-- Safe to re-run with IF NOT EXISTS where possible

DO $$ BEGIN
  CREATE TYPE "KycStatus" AS ENUM ('NONE', 'PENDING', 'VERIFIED', 'FAILED', 'REQUIRES_INPUT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('REQUIRES_PAYMENT', 'AUTHORIZED', 'CAPTURED', 'CANCELLED', 'REFUNDED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend BookingStatus with AWAITING_PAYMENT
DO $$ BEGIN
  ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'AWAITING_PAYMENT';
EXCEPTION WHEN others THEN NULL; END $$;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeConnectAccountId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeConnectChargesEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeConnectPayoutsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "kycStatus" "KycStatus" NOT NULL DEFAULT 'NONE';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "kycSessionId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "kycVerifiedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
CREATE UNIQUE INDEX IF NOT EXISTS "User_stripeConnectAccountId_key" ON "User"("stripeConnectAccountId");

CREATE TABLE IF NOT EXISTS "Payment" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "amountCadCents" INTEGER NOT NULL,
  "platformFeeCents" INTEGER NOT NULL,
  "travelerPayoutCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'cad',
  "provider" TEXT NOT NULL DEFAULT 'stripe',
  "status" "PaymentStatus" NOT NULL DEFAULT 'REQUIRES_PAYMENT',
  "stripePaymentIntentId" TEXT,
  "stripeCheckoutSessionId" TEXT,
  "stripeTransferId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_bookingId_key" ON "Payment"("bookingId");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_stripePaymentIntentId_key" ON "Payment"("stripePaymentIntentId");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_stripeCheckoutSessionId_key" ON "Payment"("stripeCheckoutSessionId");
CREATE INDEX IF NOT EXISTS "Payment_status_idx" ON "Payment"("status");

DO $$ BEGIN
  ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "CorridorConfig" (
  "id" TEXT NOT NULL,
  "fromCountry" TEXT NOT NULL,
  "toCountry" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'cad',
  "feeBps" INTEGER NOT NULL DEFAULT 1000,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "paymentProvider" TEXT NOT NULL DEFAULT 'stripe',
  CONSTRAINT "CorridorConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CorridorConfig_fromCountry_toCountry_key"
  ON "CorridorConfig"("fromCountry", "toCountry");
CREATE INDEX IF NOT EXISTS "CorridorConfig_active_idx" ON "CorridorConfig"("active");

CREATE TABLE IF NOT EXISTS "StripeEvent" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StripeEvent_eventId_key" ON "StripeEvent"("eventId");

-- Seed corridors Canada → Afrique
INSERT INTO "CorridorConfig" ("id", "fromCountry", "toCountry", "currency", "feeBps", "active", "paymentProvider")
VALUES
  ('corr_ca_ga', 'CA', 'GA', 'cad', 1000, true, 'stripe'),
  ('corr_ca_cm', 'CA', 'CM', 'cad', 1000, true, 'stripe'),
  ('corr_ca_ci', 'CA', 'CI', 'cad', 1000, true, 'stripe'),
  ('corr_ca_sn', 'CA', 'SN', 'cad', 1000, true, 'stripe'),
  ('corr_ca_cg', 'CA', 'CG', 'cad', 1000, true, 'stripe'),
  ('corr_ca_cd', 'CA', 'CD', 'cad', 1000, true, 'stripe')
ON CONFLICT ("fromCountry", "toCountry") DO NOTHING;
