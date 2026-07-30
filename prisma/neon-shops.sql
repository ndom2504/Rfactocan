-- Virtual shops (multi-vendor) + products + orders
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ShopStatus') THEN
    CREATE TYPE "ShopStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ShopOrderStatus') THEN
    CREATE TYPE "ShopOrderStatus" AS ENUM (
      'AWAITING_PAYMENT',
      'PAID',
      'FULFILLED',
      'CANCELLED'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Shop" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "country" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'CAD',
  "coverUrl" TEXT,
  "status" "ShopStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ShopProduct" (
  "id" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "priceCents" INTEGER NOT NULL,
  "promoPriceCents" INTEGER,
  "promoLabel" TEXT,
  "promoEndsAt" TIMESTAMP(3),
  "photoUrl" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShopProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ShopOrder" (
  "id" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unitPriceCents" INTEGER NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "platformFeeCents" INTEGER NOT NULL,
  "sellerPayoutCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'cad',
  "status" "ShopOrderStatus" NOT NULL DEFAULT 'AWAITING_PAYMENT',
  "stripeCheckoutSessionId" TEXT,
  "stripePaymentIntentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShopOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ShopOrder_stripeCheckoutSessionId_key"
  ON "ShopOrder"("stripeCheckoutSessionId");
CREATE UNIQUE INDEX IF NOT EXISTS "ShopOrder_stripePaymentIntentId_key"
  ON "ShopOrder"("stripePaymentIntentId");

CREATE INDEX IF NOT EXISTS "Shop_userId_idx" ON "Shop"("userId");
CREATE INDEX IF NOT EXISTS "Shop_category_status_idx" ON "Shop"("category", "status");
CREATE INDEX IF NOT EXISTS "Shop_status_idx" ON "Shop"("status");
CREATE INDEX IF NOT EXISTS "Shop_country_city_idx" ON "Shop"("country", "city");
CREATE INDEX IF NOT EXISTS "ShopProduct_shopId_active_idx" ON "ShopProduct"("shopId", "active");
CREATE INDEX IF NOT EXISTS "ShopOrder_shopId_status_idx" ON "ShopOrder"("shopId", "status");
CREATE INDEX IF NOT EXISTS "ShopOrder_buyerId_createdAt_idx" ON "ShopOrder"("buyerId", "createdAt");
CREATE INDEX IF NOT EXISTS "ShopOrder_productId_idx" ON "ShopOrder"("productId");
CREATE INDEX IF NOT EXISTS "ShopOrder_status_idx" ON "ShopOrder"("status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Shop_userId_fkey'
  ) THEN
    ALTER TABLE "Shop"
      ADD CONSTRAINT "Shop_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ShopProduct_shopId_fkey'
  ) THEN
    ALTER TABLE "ShopProduct"
      ADD CONSTRAINT "ShopProduct_shopId_fkey"
      FOREIGN KEY ("shopId") REFERENCES "Shop"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ShopOrder_shopId_fkey'
  ) THEN
    ALTER TABLE "ShopOrder"
      ADD CONSTRAINT "ShopOrder_shopId_fkey"
      FOREIGN KEY ("shopId") REFERENCES "Shop"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ShopOrder_buyerId_fkey'
  ) THEN
    ALTER TABLE "ShopOrder"
      ADD CONSTRAINT "ShopOrder_buyerId_fkey"
      FOREIGN KEY ("buyerId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ShopOrder_productId_fkey'
  ) THEN
    ALTER TABLE "ShopOrder"
      ADD CONSTRAINT "ShopOrder_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "ShopProduct"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
