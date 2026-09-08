import { useEffect, useState } from "react";
import { getApiUrl } from "@/lib/api";

export type CorridorCountry = {
  code: string;
  name: string;
  cities: string[];
};

export type CorridorRegion = {
  id: string;
  name: string;
  nameEn: string;
  codes: string[];
};

export type CorridorCatalog = {
  countries: CorridorCountry[];
  regions: CorridorRegion[];
};

function fallbackCatalog(): CorridorCatalog {
  return { countries: FALLBACK_COUNTRIES, regions: FALLBACK_REGIONS };
}

function mergeCountries(api: CorridorCountry[]): CorridorCountry[] {
  const extra = new Map(FALLBACK_COUNTRIES.map((c) => [c.code, c]));
  const seen = new Set<string>();
  const out: CorridorCountry[] = [];
  for (const c of api) {
    const code = (c.code ?? "").trim().toUpperCase();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    const fb = extra.get(code);
    const apiCities = Array.isArray(c.cities) ? c.cities.filter(Boolean) : [];
    const cities =
      apiCities.length >= (fb?.cities.length ?? 0) ? apiCities : fb?.cities ?? apiCities;
    out.push({
      code,
      name: c.name || fb?.name || code,
      cities,
    });
  }
  for (const c of FALLBACK_COUNTRIES) {
    if (!seen.has(c.code)) out.push(c);
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

let cache: CorridorCatalog | null = null;
let inflight: Promise<CorridorCatalog> | null = null;

export async function loadCorridors(): Promise<CorridorCatalog> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/corridors`);
      const data = (await res.json()) as CorridorCatalog;
      if (res.ok && Array.isArray(data.countries) && data.countries.length > 0) {
        cache = {
          countries: mergeCountries(data.countries),
          regions: data.regions?.length ? data.regions : FALLBACK_REGIONS,
        };
        return cache;
      }
    } catch {
      /* offline / API not deployed yet */
    }
    cache = fallbackCatalog();
    return cache;
  })();
  return inflight;
}

export function useCorridors() {
  const [catalog, setCatalog] = useState<CorridorCatalog>(
    cache ?? fallbackCatalog()
  );
  useEffect(() => {
    void loadCorridors().then(setCatalog);
  }, []);
  return catalog;
}

export function getCountryName(catalog: CorridorCatalog, code: string) {
  const c = code.trim().toUpperCase();
  return catalog.countries.find((x) => x.code === c)?.name ?? code;
}

export function getCities(catalog: CorridorCatalog, code: string) {
  const c = code.trim().toUpperCase();
  return catalog.countries.find((x) => x.code === c)?.cities ?? [];
}

export function citiesInRegion(catalog: CorridorCatalog, regionId: string) {
  const region = catalog.regions.find((r) => r.id === regionId);
  if (!region) return [];
  const set = new Set<string>();
  for (const country of catalog.countries) {
    if (region.codes.includes(country.code)) {
      for (const city of country.cities) set.add(city);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, "fr"));
}

export function countriesForRegion(catalog: CorridorCatalog, regionId: string) {
  if (!regionId) return catalog.countries;
  const region = catalog.regions.find((r) => r.id === regionId);
  if (!region) return catalog.countries;
  const codes = new Set(region.codes);
  return catalog.countries.filter((c) => codes.has(c.code));
}

/** If the current city is not in the country list, use the first suggestion. */
export function snapCity(catalog: CorridorCatalog, country: string, city: string) {
  const cities = getCities(catalog, country);
  if (!cities.length) return city;
  if (cities.includes(city)) return city;
  return cities[0] ?? city;
}

const FALLBACK_REGIONS: CorridorRegion[] = [
  { id: "north_america", name: "Amérique du Nord", nameEn: "North America", codes: ["CA", "US", "MX"] },
  { id: "caribbean", name: "Caraïbes & Amérique centrale", nameEn: "Caribbean & Central America", codes: ["HT", "DO", "CU", "JM", "GP", "MQ", "GF"] },
  { id: "south_america", name: "Amérique du Sud", nameEn: "South America", codes: ["BR", "AR", "CL", "CO", "PE", "VE", "EC"] },
  { id: "west_africa", name: "Afrique de l'Ouest", nameEn: "West Africa", codes: ["SN", "CI", "ML", "BF", "GN", "BJ", "TG", "NE", "GH", "NG", "MR", "SL", "LR", "GM", "GW", "CV"] },
  { id: "central_africa", name: "Afrique centrale", nameEn: "Central Africa", codes: ["CM", "GA", "CG", "CD", "CF", "TD", "GQ", "ST", "AO"] },
  { id: "east_southern_africa", name: "Afrique de l'Est & Australe", nameEn: "East & Southern Africa", codes: ["KE", "TZ", "UG", "ET", "RW", "BI", "MG", "MU", "SC", "RE", "ZA", "ZW", "ZM", "BW", "NA", "MZ", "MW", "DJ", "ER", "SO", "SS"] },
  { id: "north_africa", name: "Afrique du Nord", nameEn: "North Africa", codes: ["MA", "DZ", "TN", "EG", "LY", "SD"] },
  { id: "europe", name: "Europe", nameEn: "Europe", codes: ["FR", "BE", "CH", "LU", "GB", "DE", "ES", "IT", "PT", "NL", "IE", "SE", "NO", "DK", "PL", "RO", "TR"] },
  { id: "middle_east_asia", name: "Moyen-Orient & Asie", nameEn: "Middle East & Asia", codes: ["AE", "SA", "QA", "IL", "IN", "PK", "BD", "CN", "HK", "JP", "KR", "SG", "MY", "TH", "VN", "PH", "ID"] },
  { id: "oceania", name: "Océanie", nameEn: "Oceania", codes: ["AU", "NZ"] },
];

const FALLBACK_COUNTRIES: CorridorCountry[] = [
  { code: "CA", name: "Canada", cities: ["Montréal", "Toronto", "Ottawa", "Vancouver", "Calgary", "Québec", "Edmonton", "Winnipeg"] },
  { code: "US", name: "États-Unis", cities: ["New York", "Los Angeles", "Chicago", "Houston", "Miami", "Washington", "Boston", "San Francisco", "Atlanta", "Seattle"] },
  { code: "MX", name: "Mexique", cities: ["Mexico", "Guadalajara", "Monterrey", "Cancún", "Tijuana"] },
  { code: "HT", name: "Haïti", cities: ["Port-au-Prince", "Cap-Haïtien", "Les Cayes"] },
  { code: "DO", name: "République dominicaine", cities: ["Saint-Domingue", "Santiago", "Punta Cana"] },
  { code: "CU", name: "Cuba", cities: ["La Havane", "Santiago de Cuba", "Varadero"] },
  { code: "JM", name: "Jamaïque", cities: ["Kingston", "Montego Bay"] },
  { code: "GP", name: "Guadeloupe", cities: ["Pointe-à-Pitre", "Basse-Terre"] },
  { code: "MQ", name: "Martinique", cities: ["Fort-de-France"] },
  { code: "GF", name: "Guyane française", cities: ["Cayenne", "Kourou"] },
  { code: "BR", name: "Brésil", cities: ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador", "Belo Horizonte"] },
  { code: "AR", name: "Argentine", cities: ["Buenos Aires", "Córdoba", "Mendoza"] },
  { code: "CL", name: "Chili", cities: ["Santiago", "Valparaíso", "Antofagasta"] },
  { code: "CO", name: "Colombie", cities: ["Bogotá", "Medellín", "Cali", "Cartagena"] },
  { code: "PE", name: "Pérou", cities: ["Lima", "Cusco", "Arequipa"] },
  { code: "VE", name: "Venezuela", cities: ["Caracas", "Maracaibo", "Valencia"] },
  { code: "EC", name: "Équateur", cities: ["Quito", "Guayaquil"] },
  { code: "SN", name: "Sénégal", cities: ["Dakar", "Thiès", "Saint-Louis", "Ziguinchor", "Kaolack", "Mbour", "Touba"] },
  { code: "CI", name: "Côte d'Ivoire", cities: ["Abidjan", "Bouaké", "Yamoussoukro", "San-Pédro", "Korhogo", "Daloa", "Man"] },
  { code: "ML", name: "Mali", cities: ["Bamako", "Sikasso", "Kayes", "Mopti", "Ségou"] },
  { code: "BF", name: "Burkina Faso", cities: ["Ouagadougou", "Bobo-Dioulasso", "Koudougou", "Banfora"] },
  { code: "GN", name: "Guinée", cities: ["Conakry", "Kankan", "Labé", "Nzérékoré", "Kindia"] },
  { code: "BJ", name: "Bénin", cities: ["Cotonou", "Porto-Novo", "Parakou", "Abomey-Calavi", "Abomey", "Bohicon", "Natitingou", "Djougou"] },
  { code: "TG", name: "Togo", cities: ["Lomé", "Sokodé", "Kara", "Kpalimé", "Atakpamé"] },
  { code: "NE", name: "Niger", cities: ["Niamey", "Zinder", "Maradi", "Agadez", "Tahoua"] },
  { code: "GH", name: "Ghana", cities: ["Accra", "Kumasi", "Tamale", "Tema", "Cape Coast", "Takoradi"] },
  { code: "NG", name: "Nigeria", cities: ["Lagos", "Abuja", "Port Harcourt", "Kano", "Ibadan", "Benin City", "Enugu"] },
  { code: "MR", name: "Mauritanie", cities: ["Nouakchott", "Nouadhibou", "Rosso"] },
  { code: "SL", name: "Sierra Leone", cities: ["Freetown", "Bo", "Kenema"] },
  { code: "LR", name: "Libéria", cities: ["Monrovia", "Gbarnga"] },
  { code: "GM", name: "Gambie", cities: ["Banjul", "Serekunda"] },
  { code: "GW", name: "Guinée-Bissau", cities: ["Bissau", "Bafatá"] },
  { code: "CV", name: "Cap-Vert", cities: ["Praia", "Mindelo"] },
  { code: "CM", name: "Cameroun", cities: ["Douala", "Yaoundé", "Bafoussam", "Garoua", "Bamenda", "Maroua", "Kribi", "Limbé"] },
  { code: "GA", name: "Gabon", cities: ["Libreville", "Port-Gentil", "Franceville", "Oyem", "Moanda", "Mouila", "Lambaréné", "Tchibanga", "Makokou", "Koulamoutou", "Bitam", "Owendo", "Ntoum", "Akanda", "Gamba", "Lastoursville", "Mayumba", "Ndendé", "Okondja", "Mitzic", "Ndjolé", "Fougamou", "Booué", "Cocobeach"] },
  { code: "CG", name: "Congo-Brazzaville", cities: ["Brazzaville", "Pointe-Noire", "Dolisie", "Nkayi"] },
  { code: "CD", name: "RDC", cities: ["Kinshasa", "Lubumbashi", "Goma", "Kisangani", "Bukavu", "Mbuji-Mayi", "Kananga"] },
  { code: "CF", name: "Centrafrique", cities: ["Bangui", "Bambari", "Berbérati"] },
  { code: "TD", name: "Tchad", cities: ["N'Djamena", "Moundou", "Sarh", "Abéché"] },
  { code: "GQ", name: "Guinée équatoriale", cities: ["Malabo", "Bata", "Ebebiyín"] },
  { code: "ST", name: "Sao Tomé-et-Principe", cities: ["São Tomé"] },
  { code: "AO", name: "Angola", cities: ["Luanda", "Benguela", "Huambo", "Lobito"] },
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
  { code: "MA", name: "Maroc", cities: ["Casablanca", "Rabat", "Marrakech", "Fès", "Tanger", "Agadir"] },
  { code: "DZ", name: "Algérie", cities: ["Alger", "Oran", "Constantine", "Annaba"] },
  { code: "TN", name: "Tunisie", cities: ["Tunis", "Sfax", "Sousse", "Monastir"] },
  { code: "EG", name: "Égypte", cities: ["Le Caire", "Alexandrie", "Gizeh", "Louxor", "Charm el-Cheikh"] },
  { code: "SD", name: "Soudan", cities: ["Khartoum", "Omdurman", "Port-Soudan"] },
  { code: "SS", name: "Soudan du Sud", cities: ["Djouba"] },
  { code: "SO", name: "Somalie", cities: ["Mogadiscio", "Hargeisa"] },
  { code: "DJ", name: "Djibouti", cities: ["Djibouti"] },
  { code: "ER", name: "Érythrée", cities: ["Asmara"] },
  { code: "LY", name: "Libye", cities: ["Tripoli", "Benghazi"] },
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
  { code: "AU", name: "Australie", cities: ["Sydney", "Melbourne", "Brisbane", "Perth"] },
  { code: "NZ", name: "Nouvelle-Zélande", cities: ["Auckland", "Wellington", "Christchurch"] },
].sort((a, b) => a.name.localeCompare(b.name, "fr"));
