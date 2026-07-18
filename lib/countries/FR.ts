import type { CountryConfig } from "@/lib/countries/types";

/** France — carte / virement (EUR). */
export const FR: CountryConfig = {
  code: "FR",
  name: "France",
  currency: "EUR",
  cities: [
    "Paris",
    "Lyon",
    "Marseille",
    "Toulouse",
    "Lille",
    "Bordeaux",
    "Nantes",
  ],
  services: ["colis", "transport", "transitaire", "hotel", "autre"],
  payments: ["stripe", "bank"],
  transportModes: ["AIR", "ROAD", "RAIL", "SEA"],
  communityWhatsApp: "RFacto France",
  features: { kycRequired: true, escrow: true },
};
