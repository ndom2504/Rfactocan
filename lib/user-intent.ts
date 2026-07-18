/**
 * Client-side user intent preferences (no DB schema change).
 * Maps Livrer / Commander UI to existing UserRole values.
 */

export type PrimaryIntent = "livrer" | "commander" | "both";
export type CarrierType = "commercial" | "particulier";
export type OrderIntent = "envoyer" | "recevoir";
export type PayoutChannel = "bank" | "mobile";
export type PayoutProvider =
  | "mobile_money"
  | "orange_money"
  | "moov_money"
  | "mtn_momo"
  | "airtel_money"
  | "interac";

export type ApiUserRole = "SENDER" | "TRAVELER" | "BOTH";

export type UserIntentPrefs = {
  primaryIntent: PrimaryIntent;
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
  if (intent === "livrer") return "TRAVELER";
  if (intent === "commander") return "SENDER";
  return "BOTH";
}

export function apiRoleToIntent(role: string | null | undefined): PrimaryIntent {
  if (role === "TRAVELER") return "livrer";
  if (role === "SENDER") return "commander";
  return "both";
}

export function loadUserIntent(): UserIntentPrefs {
  if (typeof window === "undefined") return { ...DEFAULT_USER_INTENT };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_USER_INTENT };
    const parsed = JSON.parse(raw) as Partial<UserIntentPrefs>;
    return { ...DEFAULT_USER_INTENT, ...parsed };
  } catch {
    return { ...DEFAULT_USER_INTENT };
  }
}

export function saveUserIntent(prefs: Partial<UserIntentPrefs>): UserIntentPrefs {
  const next = { ...loadUserIntent(), ...prefs };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

export function payoutProviderLabelKey(provider: PayoutProvider): string {
  switch (provider) {
    case "orange_money":
      return "payout_orange";
    case "moov_money":
      return "payout_moov";
    case "mtn_momo":
      return "payout_mtn";
    case "airtel_money":
      return "payout_airtel";
    case "interac":
      return "payout_interac";
    default:
      return "payout_mobile_money";
  }
}
