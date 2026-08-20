import type { CountryConfig } from "@/lib/countries/types";

/** Canada — siège / paiements carte & Interac. */
export const CA: CountryConfig = {
  code: "CA",
  name: "Canada",
  currency: "CAD",
  cities: [
    "Montréal",
    "Toronto",
    "Ottawa",
    "Vancouver",
    "Calgary",
    "Québec",
    "Edmonton",
    "Winnipeg",
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
    "formation",
    "consultation",
    "association",
    "service_public",
    "autre",
  ],
  payments: ["stripe", "interac", "bank"],
  transportModes: ["AIR", "ROAD", "RAIL", "SEA"],
  communityWhatsApp: "RFacto Canada",
  features: { kycRequired: true, escrow: true },
};
