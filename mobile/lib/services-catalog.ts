export type ServiceType = { id: string; labelFr: string; labelEn: string };
export type ServiceCategory = {
  id: string;
  labelFr: string;
  labelEn: string;
  types: ServiceType[];
};

export const PRICE_UNITS: ServiceType[] = [
  { id: "forfait", labelFr: "Forfait", labelEn: "Flat fee" },
  { id: "heure", labelFr: "Par heure", labelEn: "Per hour" },
  { id: "session", labelFr: "Par session / cours", labelEn: "Per session / class" },
  { id: "jour", labelFr: "Par jour", labelEn: "Per day" },
  { id: "nuit", labelFr: "Par nuit", labelEn: "Per night" },
];

export const TRANSPORT_MODES = [
  { code: "AIR" as const, labelFr: "Aérien", labelEn: "Air" },
  { code: "RAIL" as const, labelFr: "Ferroviaire", labelEn: "Rail" },
  { code: "SEA" as const, labelFr: "Maritime", labelEn: "Sea" },
  { code: "ROAD" as const, labelFr: "Terrestre", labelEn: "Land" },
];

const ROAD_EXTRAS: ServiceType[] = [
  { id: "TAXI", labelFr: "Taxi / course", labelEn: "Taxi / ride" },
  { id: "RENTAL", labelFr: "Location véhicule", labelEn: "Vehicle rental" },
  { id: "DRIVER", labelFr: "Chauffeur privé", labelEn: "Private driver" },
];

const TRANSPORT_TYPES: Record<string, ServiceType[]> = {
  AIR: [
    { id: "PLANE", labelFr: "Avion", labelEn: "Plane" },
    { id: "HELICOPTER", labelFr: "Hélicoptère", labelEn: "Helicopter" },
    { id: "CARGO_AIR", labelFr: "Cargo aérien", labelEn: "Air cargo" },
  ],
  SEA: [
    { id: "CARGO_SHIP", labelFr: "Cargo", labelEn: "Cargo ship" },
    { id: "FERRY", labelFr: "Ferry", labelEn: "Ferry" },
    { id: "OUTBOARD", labelFr: "Hors-bord", labelEn: "Outboard boat" },
  ],
  RAIL: [
    { id: "PASSENGER_TRAIN", labelFr: "Train voyageurs", labelEn: "Passenger train" },
    { id: "FREIGHT_TRAIN", labelFr: "Train de fret", labelEn: "Freight train" },
  ],
  ROAD: [
    ...ROAD_EXTRAS,
    { id: "CAR", labelFr: "Voiture", labelEn: "Car" },
    { id: "VAN", labelFr: "Fourgonnette", labelEn: "Van" },
    { id: "TRUCK", labelFr: "Camion", labelEn: "Truck" },
    { id: "BUS", labelFr: "Bus", labelEn: "Bus" },
  ],
};

export function transportTypesForMode(mode: string): ServiceType[] {
  return TRANSPORT_TYPES[mode] ?? TRANSPORT_TYPES.ROAD;
}

export function encodeTransportServiceType(mode: string, typeCode: string) {
  return `${mode}_${typeCode.toUpperCase()}`;
}

export const SERVICE_CATALOG: ServiceCategory[] = [
  {
    id: "hebergement",
    labelFr: "Hébergement",
    labelEn: "Lodging",
    types: [
      { id: "hotel", labelFr: "Hôtel", labelEn: "Hotel" },
      { id: "chambre", labelFr: "Chambre", labelEn: "Room" },
      { id: "appartement", labelFr: "Appartement", labelEn: "Apartment" },
    ],
  },
  {
    id: "maison",
    labelFr: "Maison & entretien",
    labelEn: "Home & upkeep",
    types: [
      { id: "nettoyage", labelFr: "Nettoyage", labelEn: "Cleaning" },
      { id: "peintre", labelFr: "Peintre", labelEn: "Painter" },
    ],
  },
  {
    id: "artisanat",
    labelFr: "Artisanat",
    labelEn: "Trades",
    types: [
      { id: "macon", labelFr: "Maçon", labelEn: "Mason" },
      { id: "menuisier", labelFr: "Menuisier", labelEn: "Carpenter" },
    ],
  },
  {
    id: "beaute",
    labelFr: "Beauté & bien-être",
    labelEn: "Beauty & wellness",
    types: [{ id: "coiffure", labelFr: "Coiffure", labelEn: "Hairdressing" }],
  },
  {
    id: "famille",
    labelFr: "Famille",
    labelEn: "Family",
    types: [{ id: "nounou", labelFr: "Nounou", labelEn: "Nanny" }],
  },
  {
    id: "evenements",
    labelFr: "Événements",
    labelEn: "Events",
    types: [
      { id: "maitre_ceremonie", labelFr: "Maître de cérémonie", labelEn: "Master of ceremonies" },
      { id: "dj", labelFr: "DJ", labelEn: "DJ" },
      { id: "photographe", labelFr: "Photographe", labelEn: "Photographer" },
      { id: "traiteur", labelFr: "Traiteur", labelEn: "Caterer" },
    ],
  },
  {
    id: "sport",
    labelFr: "Sport & bien-être",
    labelEn: "Sport & wellness",
    types: [
      { id: "coach_sportif", labelFr: "Coach sportif", labelEn: "Sports coach" },
      { id: "kine", labelFr: "Kinésithérapeute", labelEn: "Physiotherapist" },
      { id: "yoga_pilates", labelFr: "Yoga / Pilates", labelEn: "Yoga / Pilates" },
    ],
  },
  {
    id: "vente",
    labelFr: "Vente & commerce",
    labelEn: "Sales & retail",
    types: [
      { id: "alimentaire", labelFr: "Alimentaire", labelEn: "Food & grocery" },
      { id: "mode_textile", labelFr: "Mode & textile", labelEn: "Fashion & textile" },
      { id: "electronique", labelFr: "Électronique", labelEn: "Electronics" },
      { id: "autre_vente", labelFr: "Autre secteur", labelEn: "Other sector" },
    ],
  },
  {
    id: "informatique",
    labelFr: "Informatique & design",
    labelEn: "IT & design",
    types: [
      { id: "depannage_info", labelFr: "Dépannage informatique", labelEn: "IT support" },
      { id: "developpement_web", labelFr: "Développement web", labelEn: "Web development" },
      { id: "developpement_mobile", labelFr: "Développement mobile", labelEn: "Mobile development" },
    ],
  },
  {
    id: "formation",
    labelFr: "Formation",
    labelEn: "Training",
    types: [
      { id: "langues", labelFr: "Langues", labelEn: "Languages" },
      { id: "programmation", labelFr: "Programmation & tech", labelEn: "Programming & tech" },
      { id: "dropshipping", labelFr: "Dropshipping & e-commerce", labelEn: "Dropshipping" },
    ],
  },
  {
    id: "consultation",
    labelFr: "Consultation",
    labelEn: "Consultation",
    types: [
      { id: "business", labelFr: "Business / entreprise", labelEn: "Business" },
      { id: "juridique", labelFr: "Juridique", labelEn: "Legal" },
      { id: "autre_consultation", labelFr: "Autre consultation", labelEn: "Other consultation" },
    ],
  },
  {
    id: "association",
    labelFr: "Association",
    labelEn: "Association",
    types: [
      { id: "communautaire", labelFr: "Communautaire", labelEn: "Community" },
      { id: "diaspora", labelFr: "Diaspora", labelEn: "Diaspora" },
    ],
  },
  {
    id: "service_public",
    labelFr: "Service public",
    labelEn: "Public service",
    types: [
      { id: "etat_civil", labelFr: "État civil", labelEn: "Civil registry" },
      { id: "immigration_visa", labelFr: "Immigration / visa", labelEn: "Immigration / visa" },
    ],
  },
  {
    id: "transport",
    labelFr: "Transport",
    labelEn: "Transport",
    types: [],
  },
  {
    id: "transitaire",
    labelFr: "Transit & logistique",
    labelEn: "Freight & logistics",
    types: [
      { id: "transitaire", labelFr: "Transitaire", labelEn: "Freight forwarder" },
      { id: "personal_shopper", labelFr: "Personal shopper", labelEn: "Personal shopper" },
      { id: "courtier_douane", labelFr: "Courtier en douane", labelEn: "Customs broker" },
      { id: "autre_logistique", labelFr: "Autre logistique", labelEn: "Other logistics" },
    ],
  },
  {
    id: "autre",
    labelFr: "Autres services",
    labelEn: "Other services",
    types: [{ id: "autre", labelFr: "Autre", labelEn: "Other" }],
  },
];

const CURRENCY_BY_COUNTRY: Record<string, string> = {
  CA: "CAD",
  US: "USD",
  FR: "EUR",
  BE: "EUR",
  SN: "XOF",
  CI: "XOF",
  GA: "XAF",
  CM: "XAF",
  CG: "XAF",
  CD: "USD",
};

export function currencyForCountry(country?: string | null) {
  const code = (country ?? "").trim().toUpperCase();
  if (CURRENCY_BY_COUNTRY[code]) return CURRENCY_BY_COUNTRY[code];
  if (code.includes("GABON")) return "XAF";
  if (code.includes("CANADA")) return "CAD";
  if (code.includes("FRANCE")) return "EUR";
  return "CAD";
}

export function catalogLabel(
  item: { labelFr: string; labelEn: string },
  locale: "fr" | "en"
) {
  return locale === "en" ? item.labelEn : item.labelFr;
}
