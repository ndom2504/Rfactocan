import type { CountryConfig } from "@/lib/countries/types";

/** Guinée — Orange / MTN (devise présentée en USD côté Stripe). */
export const GN: CountryConfig = {
  code: "GN",
  name: "Guinée",
  currency: "USD",
  cities: ["Conakry", "Kankan", "Labé", "Nzérékoré", "Kindia"],
  services: ["colis", "transport", "transitaire", "hotel", "autre"],
  payments: ["orange_money", "mtn_momo", "mobile_money", "bank"],
  transportModes: ["AIR", "ROAD", "SEA"],
  communityWhatsApp: "RFacto Guinée",
  features: { kycRequired: true, escrow: true },
};
