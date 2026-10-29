import {
  DEFAULT_FEATURES,
  DEFAULT_PAYMENTS,
  DEFAULT_SERVICES,
  DEFAULT_TRANSPORT_MODES,
  SERVICE_LABELS_EN,
  SERVICE_LABELS_FR,
} from "@/lib/countries/defaults";
import {
  COUNTRY_CONFIGS,
  PILOT_COUNTRY_CODES,
  hasCountryConfig,
  listConfiguredCountryCodes,
} from "@/lib/countries/registry";
import type {
  CountryConfig,
  CountryPayment,
  ServiceCategory,
} from "@/lib/countries/types";
import { COUNTRIES } from "@/lib/corridors";
import type { MoneyCurrency } from "@/lib/currency";
import type { TransportMode } from "@/lib/transport";

export type { CountryConfig, CountryPayment, ServiceCategory };
export {
  COUNTRY_CONFIGS,
  PILOT_COUNTRY_CODES,
  hasCountryConfig,
  listConfiguredCountryCodes,
  SERVICE_LABELS_EN,
  SERVICE_LABELS_FR,
};

function normalizeCode(code?: string | null): string {
  return (code ?? "").trim().toUpperCase();
}

/**
 * Config résolue pour un pays.
 * - Si un fichier dédié existe (CA, GA, CM, CI…) → options de ce pays.
 * - Sinon → catalogue corridors + valeurs par défaut.
 */
export function getCountryConfig(code?: string | null): CountryConfig {
  const c = normalizeCode(code);
  const dedicated = c ? COUNTRY_CONFIGS[c] : undefined;
  if (dedicated) {
    return {
      ...dedicated,
      features: { ...DEFAULT_FEATURES, ...dedicated.features },
    };
  }

  const base = COUNTRIES.find((x) => x.code === c);
  return {
    code: c || "CA",
    name: base?.name ?? (c || "Canada"),
    currency: "CAD",
    cities: base?.cities ?? [],
    services: [...DEFAULT_SERVICES],
    payments: [...DEFAULT_PAYMENTS],
    transportModes: [...DEFAULT_TRANSPORT_MODES],
    communityWhatsApp: base ? `RFacto ${base.name}` : "RFacto",
    features: { ...DEFAULT_FEATURES },
  };
}

export function servicesForCountry(code?: string | null): ServiceCategory[] {
  return getCountryConfig(code).services;
}

export function paymentsForCountry(code?: string | null): CountryPayment[] {
  return getCountryConfig(code).payments;
}

export function transportModesForCountry(
  code?: string | null
): TransportMode[] {
  return getCountryConfig(code).transportModes;
}

export function currencyFromCountryConfig(
  code?: string | null
): MoneyCurrency {
  return getCountryConfig(code).currency;
}

/** Labels FR/EN pour une catégorie de service. */
export function serviceLabel(
  category: ServiceCategory,
  locale: "fr" | "en" = "fr"
): string {
  return locale === "en"
    ? SERVICE_LABELS_EN[category]
    : SERVICE_LABELS_FR[category];
}
