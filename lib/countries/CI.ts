import type { CountryConfig } from "@/lib/countries/types";

/** Côte d'Ivoire — Orange / Moov / MTN (UEMOA). */
export const CI: CountryConfig = {
  code: "CI",
  name: "Côte d'Ivoire",
  currency: "XOF",
  cities: [
    "Abidjan",
    "Bouaké",
    "Yamoussoukro",
    "San-Pédro",
    "Korhogo",
    "Daloa",
    "Man",
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
  payments: ["orange_money", "moov_money", "mtn_momo", "mobile_money", "bank"],
  transportModes: ["AIR", "ROAD", "SEA"],
  communityWhatsApp: "RFacto Côte d'Ivoire",
  features: { kycRequired: true, escrow: true },
};
