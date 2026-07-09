-- Geo foundation for worldwide Rfacto (run in Neon SQL Editor)
-- Currency / Language / Country / City + User extensions

CREATE TABLE IF NOT EXISTS "Currency" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "Currency_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Currency_code_key" ON "Currency"("code");

CREATE TABLE IF NOT EXISTS "Language" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "Language_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Language_code_key" ON "Language"("code");

CREATE TABLE IF NOT EXISTS "Country" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "continent" TEXT NOT NULL,
  "flagEmoji" TEXT,
  "currencyCode" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Country_code_key" ON "Country"("code");
CREATE INDEX IF NOT EXISTS "Country_continent_idx" ON "Country"("continent");
CREATE INDEX IF NOT EXISTS "Country_name_idx" ON "Country"("name");

DO $$ BEGIN
  ALTER TABLE "Country" ADD CONSTRAINT "Country_currencyCode_fkey"
    FOREIGN KEY ("currencyCode") REFERENCES "Currency"("code") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "City" (
  "id" TEXT NOT NULL,
  "countryCode" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "City_countryCode_name_key" ON "City"("countryCode", "name");
CREATE INDEX IF NOT EXISTS "City_name_idx" ON "City"("name");

DO $$ BEGIN
  ALTER TABLE "City" ADD CONSTRAINT "City_countryCode_fkey"
    FOREIGN KEY ("countryCode") REFERENCES "Country"("code") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "language" TEXT NOT NULL DEFAULT 'fr';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "preferredCurrency" TEXT NOT NULL DEFAULT 'CAD';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "completedDeliveries" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'CAD';
CREATE INDEX IF NOT EXISTS "Trip_fromCountry_toCountry_departAt_idx"
  ON "Trip"("fromCountry", "toCountry", "departAt");

-- Minimal currency seed (full seed via npm run db:seed)
INSERT INTO "Currency" ("id", "code", "name", "symbol", "exchangeRate", "active") VALUES
  ('cur_cad', 'CAD', 'Dollar canadien', 'CA$', 1, true),
  ('cur_usd', 'USD', 'Dollar américain', 'US$', 0.74, true),
  ('cur_eur', 'EUR', 'Euro', '€', 0.68, true),
  ('cur_xaf', 'XAF', 'Franc CFA (BEAC)', 'FCFA', 450, true),
  ('cur_xof', 'XOF', 'Franc CFA (BCEAO)', 'CFA', 450, true)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "Language" ("id", "code", "name", "active") VALUES
  ('lang_fr', 'fr', 'Français', true),
  ('lang_en', 'en', 'English', true)
ON CONFLICT ("code") DO NOTHING;
