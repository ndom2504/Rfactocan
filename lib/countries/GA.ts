import type { CountryConfig } from "@/lib/countries/types";

/** Gabon — Mobile Money local (Airtel / Moov). */
export const GA: CountryConfig = {
  code: "GA",
  name: "Gabon",
  currency: "XAF",
  cities: [
    "Libreville",
    "Port-Gentil",
    "Franceville",
    "Oyem",
    "Moanda",
    "Lambaréné",
    "Tchibanga",
    "Makokou",
  ],
  services: ["colis", "transport", "transitaire", "hotel", "autre"],
  payments: ["airtel_money", "moov_money", "mobile_money", "bank"],
  transportModes: ["AIR", "ROAD", "SEA"],
  communityWhatsApp: "RFacto Gabon",
  features: { kycRequired: true, escrow: true },
};
