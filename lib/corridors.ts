export const COUNTRIES = [
  { code: "CA", name: "Canada", cities: ["Montréal", "Toronto", "Ottawa", "Vancouver", "Calgary", "Québec"] },
  { code: "GA", name: "Gabon", cities: ["Libreville", "Port-Gentil", "Franceville"] },
  { code: "CM", name: "Cameroun", cities: ["Douala", "Yaoundé", "Bafoussam"] },
  { code: "CI", name: "Côte d'Ivoire", cities: ["Abidjan", "Bouaké", "Yamoussoukro"] },
  { code: "SN", name: "Sénégal", cities: ["Dakar", "Thiès", "Saint-Louis"] },
  { code: "CG", name: "Congo-Brazzaville", cities: ["Brazzaville", "Pointe-Noire"] },
  { code: "CD", name: "RDC", cities: ["Kinshasa", "Lubumbashi", "Goma"] },
] as const;

export type CountryCode = (typeof COUNTRIES)[number]["code"];

export function getCountryName(code: string) {
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

export function getCities(code: string) {
  return COUNTRIES.find((c) => c.code === code)?.cities ?? [];
}

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  PROPOSED: "Proposée",
  ACCEPTED: "Acceptée",
  HANDED_OVER: "Remis au voyageur",
  IN_TRANSIT: "En transit",
  DELIVERED: "Livré",
  CANCELLED: "Annulée",
  REFUSED: "Refusée",
};

export const URGENCY_LABELS: Record<string, string> = {
  LOW: "Faible",
  NORMAL: "Normale",
  HIGH: "Élevée",
  URGENT: "Urgente",
};
