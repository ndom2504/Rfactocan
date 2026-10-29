const AFRICA = new Set([
  "DZ",
  "AO",
  "BJ",
  "BW",
  "BF",
  "BI",
  "CV",
  "CM",
  "CF",
  "TD",
  "KM",
  "CG",
  "CD",
  "CI",
  "DJ",
  "EG",
  "GQ",
  "ER",
  "SZ",
  "ET",
  "GA",
  "GM",
  "GH",
  "GN",
  "GW",
  "KE",
  "LS",
  "LR",
  "LY",
  "MG",
  "MW",
  "ML",
  "MR",
  "MU",
  "MA",
  "MZ",
  "NA",
  "NE",
  "NG",
  "RW",
  "ST",
  "SN",
  "SC",
  "SL",
  "SO",
  "ZA",
  "SS",
  "SD",
  "TZ",
  "TG",
  "TN",
  "UG",
  "EH",
  "ZM",
  "ZW",
]);

/** Flip to `false` to restore Stripe Identity / KYC gates and UI. */
export const KYC_ENFORCEMENT_SUSPENDED = true;

export function isIdentityVerificationEnabled() {
  return !KYC_ENFORCEMENT_SUSPENDED;
}

export function showIdentityVerified(verified?: boolean | null) {
  return isIdentityVerificationEnabled() && Boolean(verified);
}

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

function isAfricanCountry(country?: string | null) {
  const code = countryCode(country);
  if (!code) return false;
  return AFRICA.has(code) || code.includes("GABON");
}

function kycRequiredForCountry(country?: string | null) {
  if (KYC_ENFORCEMENT_SUSPENDED) return false;
  if (isAfricanCountry(country)) return false;
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
  if (KYC_ENFORCEMENT_SUSPENDED) return true;
  if (user.kycRequired === false) return true;
  if (isAfricanCountry(user.country) || isAfricanCountry(contextCountry)) {
    return true;
  }
  if (!kycRequiredForCountry(user.country)) return true;
  if (contextCountry && !kycRequiredForCountry(contextCountry)) return true;
  return identityDocumentsAccepted(user);
}
