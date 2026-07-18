import type { CountryConfig } from "@/lib/countries/types";

/** Ghana — MTN MoMo (devise présentée en USD côté Stripe). */
export const GH: CountryConfig = {
  code: "GH",
  name: "Ghana",
  currency: "USD",
  cities: [
    "Accra",
    "Kumasi",
    "Tamale",
    "Tema",
    "Cape Coast",
    "Takoradi",
  ],
  services: [
    "colis",
    "hebergement",
    "maison",
    "artisanat",
    "beaute",
    "famille",
    "evenements",
    "transport",
    "transitaire",
    "autre",
  ],
  payments: ["mtn_momo", "mobile_money", "bank", "stripe"],
  transportModes: ["AIR", "ROAD", "SEA"],
  communityWhatsApp: "RFacto Ghana",
  features: { kycRequired: true, escrow: true },
};
