export type MoneyCurrency = "CAD" | "USD" | "EUR" | "XOF" | "XAF";

/** Stripe zero-decimal currencies: amount is in whole francs, not cents. */
const ZERO_DECIMAL = new Set<MoneyCurrency>(["XOF", "XAF"]);

export const CURRENCY_OPTIONS: { code: MoneyCurrency; label: string }[] = [
  { code: "CAD", label: "CAD — Dollar canadien" },
  { code: "USD", label: "USD — Dollar américain" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "XOF", label: "FCFA Ouest (XOF)" },
  { code: "XAF", label: "FCFA Centre (XAF)" },
];

const COUNTRY_CURRENCY: Record<string, MoneyCurrency> = {
  CA: "CAD",
  US: "USD",
  MX: "USD",
  FR: "EUR",
  BE: "EUR",
  DE: "EUR",
  ES: "EUR",
  IT: "EUR",
  NL: "EUR",
  PT: "EUR",
  IE: "EUR",
  LU: "EUR",
  AT: "EUR",
  FI: "EUR",
  GR: "EUR",
  GB: "EUR",
  CH: "EUR",
  // UEMOA — FCFA Ouest
  SN: "XOF",
  CI: "XOF",
  BJ: "XOF",
  BF: "XOF",
  ML: "XOF",
  NE: "XOF",
  TG: "XOF",
  GW: "XOF",
  // CEMAC — FCFA Centre
  CM: "XAF",
  GA: "XAF",
  CG: "XAF",
  TD: "XAF",
  CF: "XAF",
  GQ: "XAF",
  CD: "USD",
  MA: "EUR",
  TN: "EUR",
  DZ: "EUR",
  AE: "USD",
  NG: "USD",
  GH: "USD",
  KE: "USD",
  ZA: "USD",
  IN: "USD",
  AU: "USD",
};

/** Approx. units of currency per 1 CAD (display / checkout FX). */
const RATE_VS_CAD: Record<MoneyCurrency, number> = {
  CAD: 1,
  USD: 0.74,
  EUR: 0.68,
  XOF: 450,
  XAF: 450,
};

export function isZeroDecimalCurrency(code: MoneyCurrency | string) {
  return ZERO_DECIMAL.has(code.toUpperCase() as MoneyCurrency);
}

/** Prefer destination corridor currency, else origin, else CAD. */
export function resolveCheckoutCurrency(
  fromCountry: string,
  toCountry: string,
  corridorCurrency?: string | null
): MoneyCurrency {
  const fromCorridor = normalizeCurrency(corridorCurrency);
  if (fromCorridor) return fromCorridor;
  return (
    COUNTRY_CURRENCY[toCountry.toUpperCase()] ||
    COUNTRY_CURRENCY[fromCountry.toUpperCase()] ||
    "CAD"
  );
}

/**
 * Checkout currency for the payer: preferred account currency first,
 * then trip currency, then corridor/route fallback.
 */
export function resolvePayerCurrency(input: {
  preferredCurrency?: string | null;
  tripCurrency?: string | null;
  fromCountry: string;
  toCountry: string;
  corridorCurrency?: string | null;
}): MoneyCurrency {
  return (
    normalizeCurrency(input.preferredCurrency) ||
    normalizeCurrency(input.tripCurrency) ||
    resolveCheckoutCurrency(
      input.fromCountry,
      input.toCountry,
      input.corridorCurrency
    )
  );
}

export function normalizeCurrency(code?: string | null): MoneyCurrency | null {
  if (!code) return null;
  const c = code.trim().toUpperCase();
  if (c === "FCFA" || c === "CFA") return "XOF";
  if (c === "CAD" || c === "USD" || c === "EUR" || c === "XOF" || c === "XAF") {
    return c;
  }
  return null;
}

export function rateVsCad(code: MoneyCurrency) {
  return RATE_VS_CAD[code] ?? 1;
}

/** Convert a major-unit amount between supported currencies. */
export function convertAmount(
  amount: number,
  from: MoneyCurrency,
  to: MoneyCurrency
) {
  if (from === to) return amount;
  const inCad = amount / rateVsCad(from);
  return inCad * rateVsCad(to);
}

export function toStripeCurrency(code: MoneyCurrency) {
  return code.toLowerCase();
}

/** Stripe unit_amount: cents for CAD/USD/EUR, whole francs for XOF/XAF. */
export function toStripeAmountUnits(
  majorAmount: number,
  currency: MoneyCurrency
) {
  if (isZeroDecimalCurrency(currency)) {
    return Math.max(100, Math.round(majorAmount));
  }
  return Math.max(100, Math.round(majorAmount * 100));
}

export function formatMoney(
  amount: number,
  currency: MoneyCurrency = "CAD",
  locale = "fr-CA"
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: isZeroDecimalCurrency(currency) ? 0 : 2,
  }).format(amount);
}

/** Format a Stripe/DB amount field (cents or whole FCFA). */
export function formatMoneyFromCents(
  units: number,
  currency: MoneyCurrency | string = "CAD",
  locale = "fr-CA"
) {
  const code = (normalizeCurrency(currency) ?? "CAD") as MoneyCurrency;
  const major = isZeroDecimalCurrency(code) ? units : units / 100;
  return formatMoney(major, code, locale);
}
