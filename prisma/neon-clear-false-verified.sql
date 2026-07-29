-- Clear "verified" flags that were set by Google auth (email only), not KYC.
-- Safe: only clears verifiedAt when KYC is not VERIFIED.
UPDATE "User"
SET "verifiedAt" = NULL
WHERE "kycStatus" <> 'VERIFIED'
  AND "verifiedAt" IS NOT NULL;
