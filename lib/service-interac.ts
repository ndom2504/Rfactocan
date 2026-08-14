/** Interac e-Transfer helpers for Canadian service payments. */

export function isInteracPreferredCurrency(currency: string) {
  return currency.trim().toUpperCase() === "CAD";
}

type PayoutFields = {
  payoutChannel?: string | null;
  payoutProvider?: string | null;
  payoutIdentifier?: string | null;
};

export function providerInteracEmail(user: PayoutFields): string | null {
  if (user.payoutProvider !== "interac") return null;
  const email = user.payoutIdentifier?.trim();
  return email || null;
}

export function providerHasInteracConfigured(user: PayoutFields) {
  return Boolean(providerInteracEmail(user));
}

export function resolveServiceReceiverHint(
  explicit: string | null | undefined,
  provider: PayoutFields
) {
  const trimmed = explicit?.trim();
  if (trimmed) return trimmed;
  return providerInteracEmail(provider);
}
