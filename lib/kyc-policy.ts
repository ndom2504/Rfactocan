import { getCountryConfig } from "@/lib/countries";
import { resolveCountryCode } from "@/lib/detect-country";

export function isKycRequiredForCountry(country?: string | null): boolean {
  const code = resolveCountryCode(country) ?? country;
  return getCountryConfig(code).features.kycRequired;
}

/** True if this user may use gated features without Stripe Identity. */
export function userSatisfiesKyc(
  user: {
    kycStatus?: string | null;
    manualIdDocStatus?: string | null;
    country?: string | null;
  },
  contextCountry?: string | null
): boolean {
  if (!isKycRequiredForCountry(user.country)) return true;
  if (contextCountry && !isKycRequiredForCountry(contextCountry)) return true;
  return (
    user.kycStatus === "VERIFIED" || user.manualIdDocStatus === "APPROVED"
  );
}

