export type IdentityUser = {
  kycStatus?: string | null;
  manualIdDocStatus?: string | null;
  country?: string | null;
  kycRequired?: boolean | null;
  identityVerified?: boolean | null;
};

function countryCode(value?: string | null) {
  return (value ?? "").trim().toUpperCase();
}

function kycRequiredForCountry(country?: string | null) {
  const code = countryCode(country);
  if (code === "GA" || code.includes("GABON")) return false;
  return true;
}

export function identityDocumentsAccepted(user: IdentityUser) {
  return (
    user.kycStatus === "VERIFIED" ||
    user.manualIdDocStatus === "APPROVED" ||
    user.identityVerified === true
  );
}

/** Same gate as server `userSatisfiesKyc` for messaging / service contact. */
export function userSatisfiesKyc(
  user: IdentityUser,
  contextCountry?: string | null
) {
  if (user.kycRequired === false) return true;
  if (!kycRequiredForCountry(user.country)) return true;
  if (contextCountry && !kycRequiredForCountry(contextCountry)) return true;
  return identityDocumentsAccepted(user);
}
