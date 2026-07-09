export type Country = {
  code: string;
  name: string;
  cities: string[];
};

/** Corridors internationaux — n'importe quel pays vers n'importe quel autre. */
export const COUNTRIES: Country[] = [
  // Amérique du Nord
  { code: "CA", name: "Canada", cities: ["Montréal", "Toronto", "Ottawa", "Vancouver", "Calgary", "Québec", "Edmonton", "Winnipeg"] },
  { code: "US", name: "États-Unis", cities: ["New York", "Los Angeles", "Chicago", "Houston", "Miami", "Washington", "Boston", "San Francisco", "Atlanta", "Seattle"] },
  { code: "MX", name: "Mexique", cities: ["Mexico", "Guadalajara", "Monterrey", "Cancún", "Tijuana"] },
  // Caraïbes / Amérique centrale
  { code: "HT", name: "Haïti", cities: ["Port-au-Prince", "Cap-Haïtien", "Les Cayes"] },
  { code: "DO", name: "République dominicaine", cities: ["Saint-Domingue", "Santiago", "Punta Cana"] },
  { code: "CU", name: "Cuba", cities: ["La Havane", "Santiago de Cuba", "Varadero"] },
  { code: "JM", name: "Jamaïque", cities: ["Kingston", "Montego Bay"] },
  { code: "GP", name: "Guadeloupe", cities: ["Pointe-à-Pitre", "Basse-Terre"] },
  { code: "MQ", name: "Martinique", cities: ["Fort-de-France"] },
  { code: "GF", name: "Guyane française", cities: ["Cayenne", "Kourou"] },
  // Amérique du Sud
  { code: "BR", name: "Brésil", cities: ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador", "Belo Horizonte"] },
  { code: "AR", name: "Argentine", cities: ["Buenos Aires", "Córdoba", "Mendoza"] },
  { code: "CL", name: "Chili", cities: ["Santiago", "Valparaíso", "Antofagasta"] },
  { code: "CO", name: "Colombie", cities: ["Bogotá", "Medellín", "Cali", "Cartagena"] },
  { code: "PE", name: "Pérou", cities: ["Lima", "Cusco", "Arequipa"] },
  { code: "VE", name: "Venezuela", cities: ["Caracas", "Maracaibo", "Valencia"] },
  { code: "EC", name: "Équateur", cities: ["Quito", "Guayaquil"] },
  // Afrique de l'Ouest
  { code: "SN", name: "Sénégal", cities: ["Dakar", "Thiès", "Saint-Louis", "Ziguinchor"] },
  { code: "CI", name: "Côte d'Ivoire", cities: ["Abidjan", "Bouaké", "Yamoussoukro", "San-Pédro"] },
  { code: "ML", name: "Mali", cities: ["Bamako", "Sikasso", "Kayes"] },
  { code: "BF", name: "Burkina Faso", cities: ["Ouagadougou", "Bobo-Dioulasso"] },
  { code: "GN", name: "Guinée", cities: ["Conakry", "Kankan", "Labé"] },
  { code: "BJ", name: "Bénin", cities: ["Cotonou", "Porto-Novo", "Parakou"] },
  { code: "TG", name: "Togo", cities: ["Lomé", "Sokodé"] },
  { code: "NE", name: "Niger", cities: ["Niamey", "Zinder"] },
  { code: "GH", name: "Ghana", cities: ["Accra", "Kumasi", "Tamale"] },
  { code: "NG", name: "Nigeria", cities: ["Lagos", "Abuja", "Port Harcourt", "Kano"] },
  { code: "MR", name: "Mauritanie", cities: ["Nouakchott", "Nouadhibou"] },
  // Afrique centrale
  { code: "CM", name: "Cameroun", cities: ["Douala", "Yaoundé", "Bafoussam", "Garoua"] },
  { code: "GA", name: "Gabon", cities: ["Libreville", "Port-Gentil", "Franceville"] },
  { code: "CG", name: "Congo-Brazzaville", cities: ["Brazzaville", "Pointe-Noire"] },
  { code: "CD", name: "RDC", cities: ["Kinshasa", "Lubumbashi", "Goma", "Kisangani"] },
  { code: "CF", name: "Centrafrique", cities: ["Bangui"] },
  { code: "TD", name: "Tchad", cities: ["N'Djamena", "Moundou"] },
  { code: "GQ", name: "Guinée équatoriale", cities: ["Malabo", "Bata"] },
  // Afrique de l'Est / Australe
  { code: "KE", name: "Kenya", cities: ["Nairobi", "Mombasa", "Kisumu"] },
  { code: "TZ", name: "Tanzanie", cities: ["Dar es Salaam", "Dodoma", "Arusha"] },
  { code: "UG", name: "Ouganda", cities: ["Kampala", "Entebbe"] },
  { code: "ET", name: "Éthiopie", cities: ["Addis-Abeba", "Dire Dawa"] },
  { code: "RW", name: "Rwanda", cities: ["Kigali"] },
  { code: "BI", name: "Burundi", cities: ["Bujumbura", "Gitega"] },
  { code: "MG", name: "Madagascar", cities: ["Antananarivo", "Toamasina"] },
  { code: "MU", name: "Maurice", cities: ["Port-Louis"] },
  { code: "RE", name: "La Réunion", cities: ["Saint-Denis", "Saint-Pierre"] },
  { code: "ZA", name: "Afrique du Sud", cities: ["Johannesburg", "Le Cap", "Durban", "Pretoria"] },
  { code: "MA", name: "Maroc", cities: ["Casablanca", "Rabat", "Marrakech", "Fès", "Tanger"] },
  { code: "DZ", name: "Algérie", cities: ["Alger", "Oran", "Constantine"] },
  { code: "TN", name: "Tunisie", cities: ["Tunis", "Sfax", "Sousse"] },
  { code: "EG", name: "Égypte", cities: ["Le Caire", "Alexandrie", "Gizeh"] },
  // Europe
  { code: "FR", name: "France", cities: ["Paris", "Lyon", "Marseille", "Toulouse", "Lille", "Bordeaux", "Nantes"] },
  { code: "BE", name: "Belgique", cities: ["Bruxelles", "Anvers", "Liège", "Gand"] },
  { code: "CH", name: "Suisse", cities: ["Genève", "Zurich", "Lausanne", "Berne"] },
  { code: "LU", name: "Luxembourg", cities: ["Luxembourg"] },
  { code: "GB", name: "Royaume-Uni", cities: ["Londres", "Manchester", "Birmingham", "Édimbourg"] },
  { code: "DE", name: "Allemagne", cities: ["Berlin", "Munich", "Francfort", "Hambourg", "Cologne"] },
  { code: "ES", name: "Espagne", cities: ["Madrid", "Barcelone", "Valence", "Séville"] },
  { code: "IT", name: "Italie", cities: ["Rome", "Milan", "Naples", "Turin"] },
  { code: "PT", name: "Portugal", cities: ["Lisbonne", "Porto"] },
  { code: "NL", name: "Pays-Bas", cities: ["Amsterdam", "Rotterdam", "La Haye"] },
  { code: "IE", name: "Irlande", cities: ["Dublin", "Cork"] },
  { code: "SE", name: "Suède", cities: ["Stockholm", "Göteborg"] },
  { code: "NO", name: "Norvège", cities: ["Oslo", "Bergen"] },
  { code: "DK", name: "Danemark", cities: ["Copenhague"] },
  { code: "PL", name: "Pologne", cities: ["Varsovie", "Cracovie"] },
  { code: "RO", name: "Roumanie", cities: ["Bucarest", "Cluj-Napoca"] },
  { code: "TR", name: "Turquie", cities: ["Istanbul", "Ankara", "Izmir"] },
  // Moyen-Orient / Asie
  { code: "AE", name: "Émirats arabes unis", cities: ["Dubaï", "Abu Dhabi", "Sharjah"] },
  { code: "SA", name: "Arabie saoudite", cities: ["Riyad", "Djeddah", "Dammam"] },
  { code: "QA", name: "Qatar", cities: ["Doha"] },
  { code: "IL", name: "Israël", cities: ["Tel Aviv", "Jérusalem"] },
  { code: "IN", name: "Inde", cities: ["Mumbai", "New Delhi", "Bangalore", "Hyderabad", "Chennai"] },
  { code: "PK", name: "Pakistan", cities: ["Karachi", "Lahore", "Islamabad"] },
  { code: "BD", name: "Bangladesh", cities: ["Dhaka", "Chittagong"] },
  { code: "CN", name: "Chine", cities: ["Pékin", "Shanghai", "Guangzhou", "Shenzhen", "Hong Kong"] },
  { code: "HK", name: "Hong Kong", cities: ["Hong Kong"] },
  { code: "JP", name: "Japon", cities: ["Tokyo", "Osaka", "Kyoto", "Yokohama"] },
  { code: "KR", name: "Corée du Sud", cities: ["Séoul", "Busan", "Incheon"] },
  { code: "SG", name: "Singapour", cities: ["Singapour"] },
  { code: "MY", name: "Malaisie", cities: ["Kuala Lumpur", "Penang"] },
  { code: "TH", name: "Thaïlande", cities: ["Bangkok", "Chiang Mai", "Phuket"] },
  { code: "VN", name: "Viêt Nam", cities: ["Hô Chi Minh-Ville", "Hanoï", "Da Nang"] },
  { code: "PH", name: "Philippines", cities: ["Manille", "Cebu", "Davao"] },
  { code: "ID", name: "Indonésie", cities: ["Jakarta", "Surabaya", "Bali"] },
  // Océanie
  { code: "AU", name: "Australie", cities: ["Sydney", "Melbourne", "Brisbane", "Perth"] },
  { code: "NZ", name: "Nouvelle-Zélande", cities: ["Auckland", "Wellington", "Christchurch"] },
].sort((a, b) => a.name.localeCompare(b.name, "fr"));

export type CountryCode = string;

export function getCountryName(code: string) {
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

export function getCities(code: string) {
  return COUNTRIES.find((c) => c.code === code)?.cities ?? [];
}

export function findCountryByName(name: string) {
  const n = name.trim().toLowerCase();
  return COUNTRIES.find((c) => c.name.toLowerCase() === n);
}

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  PROPOSED: "Proposée",
  AWAITING_PAYMENT: "En attente de paiement",
  ACCEPTED: "Acceptée (payée)",
  HANDED_OVER: "Remis au voyageur",
  IN_TRANSIT: "En transit",
  DELIVERED: "Livré",
  CANCELLED: "Annulée",
  REFUSED: "Refusée",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  REQUIRES_PAYMENT: "Paiement requis",
  AUTHORIZED: "Fonds bloqués",
  CAPTURED: "Payé / transféré",
  CANCELLED: "Annulé",
  REFUNDED: "Remboursé",
  FAILED: "Échoué",
};

export const KYC_STATUS_LABELS: Record<string, string> = {
  NONE: "Non vérifié",
  PENDING: "Vérification en cours",
  VERIFIED: "Identité vérifiée",
  FAILED: "Échec",
  REQUIRES_INPUT: "Action requise",
};

export const URGENCY_LABELS: Record<string, string> = {
  LOW: "Faible",
  NORMAL: "Normale",
  HIGH: "Élevée",
  URGENT: "Urgente",
};
