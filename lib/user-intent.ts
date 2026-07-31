/**
 * Client-side user intent preferences (localStorage).
 * Maps Vendre / Payer UI to existing UserRole values.
 */

export type PrimaryIntent = "vendre" | "payer" | "both";
/** Account status: business (commercial) or individual (particulier). */
export type CarrierType = "commercial" | "particulier";
export type AccountStatus = CarrierType;
/** Kept for parcel request UX (envoyer / recevoir). */
export type OrderIntent = "envoyer" | "recevoir";
export type PayoutChannel = "bank" | "mobile";
export type PayoutProvider =
  | "mobile_money"
  | "orange_money"
  | "moov_money"
  | "mtn_momo"
  | "airtel_money"
  | "mpesa_vodacom"
  | "interac";

export type ApiUserRole = "SENDER" | "TRAVELER" | "BOTH";

export type UserIntentPrefs = {
  primaryIntent: PrimaryIntent;
  /** Statut compte : commercial | particulier */
  carrierType: CarrierType;
  orderIntent: OrderIntent;
  payoutChannel: PayoutChannel;
  payoutProvider: PayoutProvider;
  payoutIdentifier: string;
};

const STORAGE_KEY = "rfacto_user_intent";

export const DEFAULT_USER_INTENT: UserIntentPrefs = {
  primaryIntent: "both",
  carrierType: "particulier",
  orderIntent: "envoyer",
  payoutChannel: "bank",
  payoutProvider: "mobile_money",
  payoutIdentifier: "",
};

export function intentToApiRole(intent: PrimaryIntent): ApiUserRole {
  if (intent === "vendre") return "TRAVELER";
  if (intent === "payer") return "SENDER";
  return "BOTH";
}

export function apiRoleToIntent(role: string | null | undefined): PrimaryIntent {
  if (role === "TRAVELER") return "vendre";
  if (role === "SENDER") return "payer";
  return "both";
}

/** Normalize legacy intent values from older app versions. */
export function normalizePrimaryIntent(value: unknown): PrimaryIntent {
  if (value === "vendre" || value === "livrer" || value === "TRAVELER") {
    return "vendre";
  }
  if (value === "payer" || value === "commander" || value === "SENDER") {
    return "payer";
  }
  return "both";
}

export function loadUserIntent(): UserIntentPrefs {
  if (typeof window === "undefined") return { ...DEFAULT_USER_INTENT };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_USER_INTENT };
    const parsed = JSON.parse(raw) as Partial<UserIntentPrefs> & {
      primaryIntent?: unknown;
      accountStatus?: CarrierType;
    };
    const carrierType =
      parsed.carrierType === "commercial" ||
      parsed.carrierType === "particulier"
        ? parsed.carrierType
        : parsed.accountStatus === "commercial" ||
            parsed.accountStatus === "particulier"
          ? parsed.accountStatus
          : DEFAULT_USER_INTENT.carrierType;
    return {
      ...DEFAULT_USER_INTENT,
      ...parsed,
      primaryIntent: normalizePrimaryIntent(parsed.primaryIntent),
      carrierType,
    };
  } catch {
    return { ...DEFAULT_USER_INTENT };
  }
}

export function saveUserIntent(prefs: Partial<UserIntentPrefs>): UserIntentPrefs {
  const next = { ...loadUserIntent(), ...prefs };
  if (prefs.primaryIntent !== undefined) {
    next.primaryIntent = normalizePrimaryIntent(prefs.primaryIntent);
  }
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

export type PayoutProviderLabelKey =
  | "payout_mobile_money"
  | "payout_orange"
  | "payout_moov"
  | "payout_mtn"
  | "payout_airtel"
  | "payout_mpesa"
  | "payout_interac";

export function payoutProviderLabelKey(
  provider: PayoutProvider
): PayoutProviderLabelKey {
  switch (provider) {
    case "orange_money":
      return "payout_orange";
    case "moov_money":
      return "payout_moov";
    case "mtn_momo":
      return "payout_mtn";
    case "airtel_money":
      return "payout_airtel";
    case "mpesa_vodacom":
      return "payout_mpesa";
    case "interac":
      return "payout_interac";
    default:
      return "payout_mobile_money";
  }
}
