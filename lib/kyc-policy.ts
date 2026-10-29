import { getCountryConfig } from "@/lib/countries";
import { isAfricanCountry } from "@/lib/countries/africa";
import { resolveCountryCode } from "@/lib/detect-country";

/** Flip to `false` to restore Stripe Identity / KYC gates and UI. */
export const KYC_ENFORCEMENT_SUSPENDED = true;

export function isIdentityVerificationEnabled() {
  return !KYC_ENFORCEMENT_SUSPENDED;
}

export function showIdentityVerified(verified?: boolean | null) {
  return isIdentityVerificationEnabled() && Boolean(verified);
}

/**
 * JSON `verified` for Play / old Expo, which still gate messaging on this field.
 * While KYC is suspended this is true so members can contact each other.
 * New clients hide the badge with `showIdentityVerified` locally.
 */
export function publicContactVerified(documentsOk?: boolean | null) {
  if (KYC_ENFORCEMENT_SUSPENDED) return true;
  return Boolean(documentsOk);
}

export function isKycRequiredForCountry(country?: string | null): boolean {
  if (KYC_ENFORCEMENT_SUSPENDED) return false;
  const code = resolveCountryCode(country) ?? country;
  if (isAfricanCountry(code)) return false;
  return getCountryConfig(code).features.kycRequired;
}

export function identityDocumentsAccepted(user: {
  kycStatus?: string | null;
  manualIdDocStatus?: string | null;
}): boolean {
  return (
    user.kycStatus === "VERIFIED" || user.manualIdDocStatus === "APPROVED"
  );
}

/** True if this user may use gated features without Stripe Identity. */
export function userSatisfiesKyc(
  user: {
    kycStatus?: string | null;
    manualIdDocStatus?: string | null;
    country?: string | null;
    kycRequired?: boolean | null;
  },
  contextCountry?: string | null
): boolean {
  if (KYC_ENFORCEMENT_SUSPENDED) return true;
  if (user.kycRequired === false) return true;
  if (!isKycRequiredForCountry(user.country)) return true;
  if (contextCountry && !isKycRequiredForCountry(contextCountry)) return true;
  return identityDocumentsAccepted(user);
}

