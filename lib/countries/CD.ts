import type { CountryConfig } from "@/lib/countries/types";

/** RDC (Congo-Kinshasa) — Mobile Money, devise USD. */
export const CD: CountryConfig = {
  code: "CD",
  name: "RDC",
  currency: "USD",
  cities: [
    "Kinshasa",
    "Lubumbashi",
    "Goma",
    "Kisangani",
    "Bukavu",
    "Mbuji-Mayi",
    "Kananga",
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
  payments: [
    "mpesa_vodacom",
    "mtn_momo",
    "orange_money",
    "airtel_money",
    "mobile_money",
    "bank",
  ],
  transportModes: ["AIR", "ROAD", "SEA", "RAIL"],
  communityWhatsApp: "RFacto Congo Kinshasa",
  features: { kycRequired: true, escrow: true },
};
