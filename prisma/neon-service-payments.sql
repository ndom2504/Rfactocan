-- Service payment requests (provider invoices client). Run once on Neon.

DO $$ BEGIN
  CREATE TYPE "ServicePayStatus" AS ENUM (
    'AWAITING_PAYMENT',
    'AWAITING_CONFIRMATION',
    'PAID',
    'CANCELLED',
    'EXPIRED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ServicePayMethod" AS ENUM (
    'CARD',
    'INTERAC',
    'MOBILE'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ServicePaymentRequest" (
  "id" TEXT NOT NULL,
  "listingId" TEXT,
  "threadId" TEXT,
  "providerId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'cad',
  "platformFeeCents" INTEGER NOT NULL DEFAULT 0,
  "providerPayoutCents" INTEGER NOT NULL DEFAULT 0,
  "status" "ServicePayStatus" NOT NULL DEFAULT 'AWAITING_PAYMENT',
  "payMethod" "ServicePayMethod",
  "payProvider" TEXT,
  "receiverHint" TEXT,
  "stripeCheckoutSessionId" TEXT,
  "stripePaymentIntentId" TEXT,
  "clientMarkedPaidAt" TIMESTAMP(3),
  "providerConfirmedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServicePaymentRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ServicePaymentRequest_stripeCheckoutSessionId_key"
  ON "ServicePaymentRequest"("stripeCheckoutSessionId");
CREATE UNIQUE INDEX IF NOT EXISTS "ServicePaymentRequest_stripePaymentIntentId_key"
  ON "ServicePaymentRequest"("stripePaymentIntentId");

CREATE INDEX IF NOT EXISTS "ServicePaymentRequest_providerId_createdAt_idx"
  ON "ServicePaymentRequest"("providerId", "createdAt");
CREATE INDEX IF NOT EXISTS "ServicePaymentRequest_clientId_createdAt_idx"
  ON "ServicePaymentRequest"("clientId", "createdAt");
CREATE INDEX IF NOT EXISTS "ServicePaymentRequest_threadId_idx"
  ON "ServicePaymentRequest"("threadId");
CREATE INDEX IF NOT EXISTS "ServicePaymentRequest_status_idx"
  ON "ServicePaymentRequest"("status");
CREATE INDEX IF NOT EXISTS "ServicePaymentRequest_listingId_idx"
  ON "ServicePaymentRequest"("listingId");

DO $$ BEGIN
  ALTER TABLE "ServicePaymentRequest"
    ADD CONSTRAINT "ServicePaymentRequest_listingId_fkey"
    FOREIGN KEY ("listingId") REFERENCES "ServiceListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ServicePaymentRequest"
    ADD CONSTRAINT "ServicePaymentRequest_providerId_fkey"
    FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ServicePaymentRequest"
    ADD CONSTRAINT "ServicePaymentRequest_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
