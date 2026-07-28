-- Ambassador agent codes + signup attribution
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "isAmbassador" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "agentCode" TEXT;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "referredById" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_agentCode_key"
  ON "User"("agentCode");

CREATE INDEX IF NOT EXISTS "User_referredById_idx"
  ON "User"("referredById");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'User_referredById_fkey'
  ) THEN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_referredById_fkey"
      FOREIGN KEY ("referredById") REFERENCES "User"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;
