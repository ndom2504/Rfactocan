import { CA } from "@/lib/countries/CA";
import { CD } from "@/lib/countries/CD";
import { CG } from "@/lib/countries/CG";
import { CI } from "@/lib/countries/CI";
import { CM } from "@/lib/countries/CM";
import { CN } from "@/lib/countries/CN";
import { FR } from "@/lib/countries/FR";
import { GA } from "@/lib/countries/GA";
import { GH } from "@/lib/countries/GH";
import { GN } from "@/lib/countries/GN";
import { MA } from "@/lib/countries/MA";
import { SN } from "@/lib/countries/SN";
import type { CountryConfig } from "@/lib/countries/types";
import type { MoneyCurrency } from "@/lib/currency";

/**
 * Pays pilotes avec config complète et indépendante.
 * Ordre = priorité produit (liste ambassadeurs).
 */
export const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  GA,
  CA,
  FR,
  SN,
  GH,
  CN,
  MA,
  CD,
  CG,
  CI,
  GN,
  CM,
};

/** Codes ISO des pays pilotes, dans l’ordre métier. */
export const PILOT_COUNTRY_CODES = [
  "GA",
  "CA",
  "FR",
  "SN",
  "GH",
  "CN",
  "MA",
  "CD",
  "CG",
  "CI",
  "GN",
  "CM",
] as const;

export function hasCountryConfig(code?: string | null): boolean {
  if (!code) return false;
  return Boolean(COUNTRY_CONFIGS[code.trim().toUpperCase()]);
}

export function getConfiguredCities(code?: string | null): string[] | undefined {
  if (!code) return undefined;
  return COUNTRY_CONFIGS[code.trim().toUpperCase()]?.cities;
}

export function getConfiguredCurrency(
  code?: string | null
): MoneyCurrency | undefined {
  if (!code) return undefined;
  return COUNTRY_CONFIGS[code.trim().toUpperCase()]?.currency;
}

export function listConfiguredCountryCodes(): string[] {
  return [...PILOT_COUNTRY_CODES];
}
