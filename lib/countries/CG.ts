import type { CountryConfig } from "@/lib/countries/types";

/** Congo-Brazzaville — Mobile Money (CEMAC). */
export const CG: CountryConfig = {
  code: "CG",
  name: "Congo-Brazzaville",
  currency: "XAF",
  cities: ["Brazzaville", "Pointe-Noire", "Dolisie", "Nkayi"],
  services: ["colis", "transport", "transitaire", "hotel", "autre"],
  payments: ["mtn_momo", "airtel_money", "mobile_money", "bank"],
  transportModes: ["AIR", "ROAD", "SEA"],
  communityWhatsApp: "RFacto Congo Brazzaville",
  features: { kycRequired: true, escrow: true },
};
