import type { CountryConfig } from "@/lib/countries/types";

/** Sénégal — Orange Money / Mobile Money (UEMOA). */
export const SN: CountryConfig = {
  code: "SN",
  name: "Sénégal",
  currency: "XOF",
  cities: [
    "Dakar",
    "Thiès",
    "Saint-Louis",
    "Ziguinchor",
    "Kaolack",
    "Mbour",
    "Touba",
  ],
  services: ["colis", "transport", "transitaire", "hotel", "autre"],
  payments: ["orange_money", "mobile_money", "bank"],
  transportModes: ["AIR", "ROAD", "SEA"],
  communityWhatsApp: "RFacto Sénégal",
  features: { kycRequired: true, escrow: true },
};
