import { getConfiguredCities } from "@/lib/countries/registry";

export type Country = {
  code: string;
  name: string;
  cities: string[];
};

/**
 * Catalogue pays (noms + villes de base).
 * Pour CA / GA / CM / CI : les villes font foi dans `lib/countries/*.ts`
 * et sont fusionnées via `getCities` / export `COUNTRIES`.
 */
const COUNTRIES_BASE: Country[] = [
  // Amérique du Nord
  { code: "CA", name: "Canada", cities: [] },
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
  { code: "SN", name: "Sénégal", cities: [] },
  { code: "CI", name: "Côte d'Ivoire", cities: [] },
  { code: "ML", name: "Mali", cities: ["Bamako", "Sikasso", "Kayes", "Mopti", "Ségou"] },
  { code: "BF", name: "Burkina Faso", cities: ["Ouagadougou", "Bobo-Dioulasso", "Koudougou", "Banfora"] },
  { code: "GN", name: "Guinée", cities: [] },
  { code: "BJ", name: "Bénin", cities: ["Cotonou", "Porto-Novo", "Parakou", "Abomey-Calavi", "Abomey", "Bohicon", "Natitingou", "Djougou"] },
  { code: "TG", name: "Togo", cities: ["Lomé", "Sokodé", "Kara", "Kpalimé", "Atakpamé"] },
  { code: "NE", name: "Niger", cities: ["Niamey", "Zinder", "Maradi", "Agadez", "Tahoua"] },
  { code: "GH", name: "Ghana", cities: [] },
  { code: "NG", name: "Nigeria", cities: ["Lagos", "Abuja", "Port Harcourt", "Kano", "Ibadan", "Benin City", "Enugu"] },
  { code: "MR", name: "Mauritanie", cities: ["Nouakchott", "Nouadhibou", "Rosso"] },
  { code: "SL", name: "Sierra Leone", cities: ["Freetown", "Bo", "Kenema"] },
  { code: "LR", name: "Libéria", cities: ["Monrovia", "Gbarnga"] },
  { code: "GM", name: "Gambie", cities: ["Banjul", "Serekunda"] },
  { code: "GW", name: "Guinée-Bissau", cities: ["Bissau", "Bafatá"] },
  { code: "CV", name: "Cap-Vert", cities: ["Praia", "Mindelo"] },
  // Afrique centrale
  { code: "CM", name: "Cameroun", cities: [] },
  { code: "GA", name: "Gabon", cities: [] },
  { code: "CG", name: "Congo-Brazzaville", cities: [] },
  { code: "CD", name: "RDC", cities: [] },
  { code: "CF", name: "Centrafrique", cities: ["Bangui", "Bambari", "Berbérati"] },
  { code: "TD", name: "Tchad", cities: ["N'Djamena", "Moundou", "Sarh", "Abéché"] },
  { code: "GQ", name: "Guinée équatoriale", cities: ["Malabo", "Bata", "Ebebiyín"] },
  { code: "ST", name: "Sao Tomé-et-Principe", cities: ["São Tomé"] },
  { code: "AO", name: "Angola", cities: ["Luanda", "Benguela", "Huambo", "Lobito"] },
  // Afrique de l'Est / Australe
  { code: "KE", name: "Kenya", cities: ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret"] },
  { code: "TZ", name: "Tanzanie", cities: ["Dar es Salaam", "Dodoma", "Arusha", "Mwanza", "Zanzibar"] },
  { code: "UG", name: "Ouganda", cities: ["Kampala", "Entebbe", "Jinja", "Gulu"] },
  { code: "ET", name: "Éthiopie", cities: ["Addis-Abeba", "Dire Dawa", "Bahir Dar", "Hawassa"] },
  { code: "RW", name: "Rwanda", cities: ["Kigali", "Butare", "Gisenyi"] },
  { code: "BI", name: "Burundi", cities: ["Bujumbura", "Gitega", "Ngozi"] },
  { code: "MG", name: "Madagascar", cities: ["Antananarivo", "Toamasina", "Mahajanga", "Fianarantsoa"] },
  { code: "MU", name: "Maurice", cities: ["Port-Louis", "Curepipe", "Quatre Bornes"] },
  { code: "SC", name: "Seychelles", cities: ["Victoria"] },
  { code: "RE", name: "La Réunion", cities: ["Saint-Denis", "Saint-Pierre", "Saint-Paul"] },
  { code: "ZA", name: "Afrique du Sud", cities: ["Johannesburg", "Le Cap", "Durban", "Pretoria", "Port Elizabeth"] },
  { code: "ZW", name: "Zimbabwe", cities: ["Harare", "Bulawayo", "Victoria Falls"] },
  { code: "ZM", name: "Zambie", cities: ["Lusaka", "Ndola", "Livingstone"] },
  { code: "BW", name: "Botswana", cities: ["Gaborone", "Francistown", "Maun"] },
  { code: "NA", name: "Namibie", cities: ["Windhoek", "Swakopmund", "Walvis Bay"] },
  { code: "MZ", name: "Mozambique", cities: ["Maputo", "Beira", "Nampula"] },
  { code: "MW", name: "Malawi", cities: ["Lilongwe", "Blantyre"] },
  { code: "MA", name: "Maroc", cities: [] },
  { code: "DZ", name: "Algérie", cities: ["Alger", "Oran", "Constantine", "Annaba"] },
  { code: "TN", name: "Tunisie", cities: ["Tunis", "Sfax", "Sousse", "Monastir"] },
  { code: "EG", name: "Égypte", cities: ["Le Caire", "Alexandrie", "Gizeh", "Louxor", "Charm el-Cheikh"] },
  { code: "SD", name: "Soudan", cities: ["Khartoum", "Omdurman", "Port-Soudan"] },
  { code: "SS", name: "Soudan du Sud", cities: ["Djouba"] },
  { code: "SO", name: "Somalie", cities: ["Mogadiscio", "Hargeisa"] },
  { code: "DJ", name: "Djibouti", cities: ["Djibouti"] },
  { code: "ER", name: "Érythrée", cities: ["Asmara"] },
  { code: "LY", name: "Libye", cities: ["Tripoli", "Benghazi"] },
  // Europe
  { code: "FR", name: "France", cities: [] },
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
  { code: "CN", name: "Chine", cities: [] },
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
];

/** Corridors internationaux — n'importe quel pays vers n'importe quel autre. */
export const COUNTRIES: Country[] = COUNTRIES_BASE.map((c) => ({
  ...c,
  cities: getConfiguredCities(c.code) ?? c.cities,
})).sort((a, b) => a.name.localeCompare(b.name, "fr"));

export type CountryCode = string;

export function getCountryName(code: string) {
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

export function getCities(code: string) {
  return (
    getConfiguredCities(code) ??
    COUNTRIES.find((c) => c.code === code)?.cities ??
    []
  );
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
