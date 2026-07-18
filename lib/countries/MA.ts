import type { CountryConfig } from "@/lib/countries/types";

/** Maroc — carte / virement (EUR côté plateforme). */
export const MA: CountryConfig = {
  code: "MA",
  name: "Maroc",
  currency: "EUR",
  cities: [
    "Casablanca",
    "Rabat",
    "Marrakech",
    "Fès",
    "Tanger",
    "Agadir",
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
  payments: ["stripe", "bank", "mobile_money"],
  transportModes: ["AIR", "ROAD", "SEA"],
  communityWhatsApp: "RFacto Maroc",
  features: { kycRequired: true, escrow: true },
};
