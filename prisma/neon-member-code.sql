ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "memberCode" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_memberCode_key" ON "User"("memberCode");
