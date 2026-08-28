import * as SecureStore from "expo-secure-store";

export type PrimaryIntent = "vendre" | "payer" | "both";
export type CarrierType = "commercial" | "particulier";
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

export type UserIntentPrefs = {
  primaryIntent: PrimaryIntent;
  carrierType: CarrierType;
  orderIntent: OrderIntent;
  payoutChannel: PayoutChannel;
  payoutProvider: PayoutProvider;
  payoutIdentifier: string;
  payoutBankName: string;
  payoutBankHolder: string;
  payoutBankAccount: string;
  payoutBankIban: string;
};

const KEY = "rfacto_user_intent";

export const DEFAULT_USER_INTENT: UserIntentPrefs = {
  primaryIntent: "both",
  carrierType: "particulier",
  orderIntent: "envoyer",
  payoutChannel: "mobile",
  payoutProvider: "mobile_money",
  payoutIdentifier: "",
  payoutBankName: "",
  payoutBankHolder: "",
  payoutBankAccount: "",
  payoutBankIban: "",
};

export function intentToApiRole(intent: PrimaryIntent) {
  if (intent === "vendre") return "TRAVELER";
  if (intent === "payer") return "SENDER";
  return "BOTH";
}

export function apiRoleToIntent(role?: string | null): PrimaryIntent {
  if (role === "TRAVELER") return "vendre";
  if (role === "SENDER") return "payer";
  return "both";
}

export async function loadUserIntent(): Promise<UserIntentPrefs> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return { ...DEFAULT_USER_INTENT };
    const parsed = JSON.parse(raw) as Partial<UserIntentPrefs>;
    return { ...DEFAULT_USER_INTENT, ...parsed };
  } catch {
    return { ...DEFAULT_USER_INTENT };
  }
}

export async function saveUserIntent(
  prefs: Partial<UserIntentPrefs>
): Promise<UserIntentPrefs> {
  const next = { ...(await loadUserIntent()), ...prefs };
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}
