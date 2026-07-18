import type { CountryConfig } from "@/lib/countries/types";

/** Cameroun — MTN MoMo / Orange Money. */
export const CM: CountryConfig = {
  code: "CM",
  name: "Cameroun",
  currency: "XAF",
  cities: [
    "Douala",
    "Yaoundé",
    "Bafoussam",
    "Garoua",
    "Bamenda",
    "Maroua",
    "Kribi",
    "Limbé",
  ],
  services: ["colis", "transport", "transitaire", "hotel", "autre"],
  payments: ["mtn_momo", "orange_money", "mobile_money", "bank"],
  transportModes: ["AIR", "ROAD", "RAIL", "SEA"],
  communityWhatsApp: "RFacto Cameroun",
  features: { kycRequired: true, escrow: true },
};
