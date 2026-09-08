export type MoneyCurrency = "CAD" | "USD" | "EUR" | "XOF" | "XAF";

export const CURRENCY_OPTIONS: MoneyCurrency[] = ["CAD", "USD", "EUR", "XOF", "XAF"];

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
  GB: "EUR",
  CH: "EUR",
  SN: "XOF",
  CI: "XOF",
  BJ: "XOF",
  BF: "XOF",
  ML: "XOF",
  NE: "XOF",
  TG: "XOF",
  GW: "XOF",
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
  GH: "USD",
  GN: "USD",
  CN: "USD",
};

export function currencyForCountry(country?: string | null): MoneyCurrency {
  if (!country) return "CAD";
  const code = country.trim().toUpperCase();
  return COUNTRY_CURRENCY[code] ?? "CAD";
}

export function resolveCheckoutCurrency(
  fromCountry: string,
  toCountry: string
): MoneyCurrency {
  if (toCountry?.trim()) return currencyForCountry(toCountry);
  return currencyForCountry(fromCountry);
}

export function normalizeCurrency(value?: string | null): MoneyCurrency | null {
  const v = (value || "").trim().toUpperCase();
  if (v === "CAD" || v === "USD" || v === "EUR" || v === "XOF" || v === "XAF") {
    return v;
  }
  return null;
}
