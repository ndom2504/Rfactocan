export type MoneyCurrency = "CAD" | "USD" | "EUR";

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
  SN: "EUR",
  CI: "EUR",
  CM: "EUR",
  GA: "EUR",
  CG: "EUR",
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
};

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
  if (c === "CAD" || c === "USD" || c === "EUR") return c;
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

export function formatMoney(
  amount: number,
  currency: MoneyCurrency = "CAD",
  locale = "fr-CA"
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}

export function formatMoneyFromCents(
  cents: number,
  currency: MoneyCurrency = "CAD",
  locale = "fr-CA"
) {
  return formatMoney(cents / 100, currency, locale);
}
