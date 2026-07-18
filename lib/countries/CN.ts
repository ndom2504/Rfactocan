import type { CountryConfig } from "@/lib/countries/types";

/** Chine — corridors diaspora / transit (USD côté plateforme). */
export const CN: CountryConfig = {
  code: "CN",
  name: "Chine",
  currency: "USD",
  cities: [
    "Pékin",
    "Shanghai",
    "Guangzhou",
    "Shenzhen",
    "Hong Kong",
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
  payments: ["stripe", "bank"],
  transportModes: ["AIR", "SEA", "RAIL", "ROAD"],
  communityWhatsApp: "RFacto Chine",
  features: { kycRequired: true, escrow: true },
};
