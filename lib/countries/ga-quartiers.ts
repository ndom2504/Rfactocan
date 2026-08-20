/**
 * Quartiers gabonais par ville (filtre de publication de service).
 * Sources : mairies (Lambaréné, Port-Gentil), toponymie usuelle (Libreville,
 * Akanda, Owendo) et quartiers couramment cités pour les autres communes.
 * Liste pratique, pas un cadastre officiel exhaustif — « Autre » reste possible.
 */

export const GA_CITY_QUARTIER_SEP = " · ";
export const GA_QUARTIER_OTHER = "__other__";

const GA_QUARTIERS_BY_CITY: Record<string, string[]> = {
  Libreville: [
    "Akébé",
    "Akébé-Frontière",
    "Akébé-Plaine",
    "Akébé-Ville",
    "Alibandeng",
    "Ambowé",
    "Awendjé",
    "Avéa",
    "Baraka",
    "Bas de Gué-Gué",
    "Batterie IV",
    "Beau Séjour",
    "Belle-Vue",
    "Belles Peintures",
    "Bikele",
    "Camp de Gaulle",
    "Centre-ville",
    "Charbonnages",
    "Cité Damas",
    "Cité de la Caisse",
    "Cocotiers",
    "Derrière-la-Prison",
    "Dragon",
    "FOPI",
    "Glass",
    "Gros-Bouquet",
    "Haut de Gué-Gué",
    "IAI",
    "Kingélé",
    "La Campagne",
    "Lalala",
    "Likouala-Mossaka",
    "London",
    "Louis",
    "Mindoubé 1",
    "Mindoubé 2",
    "Mindoubé 3",
    "Mont-Bouët",
    "Montagne Sainte",
    "Nkembo",
    "Nomba",
    "Nombakélé",
    "Nzeng-Ayong",
    "Oloumi",
    "Osengè",
    "Ozangué",
    "PK 5",
    "PK 8",
    "PK 9",
    "PK 12",
    "Plein Ciel",
    "Plaine Niger",
    "Plaine Orety",
    "Pont Nomba",
    "Pont d’Akébé",
    "Rio",
    "Sibang",
    "Sotega",
    "Tahiti",
    "Venez-Voir",
    "Zone industrielle d’Oloumi",
  ],
  Akanda: [
    "1er Campement",
    "Akouango",
    "Angondjé",
    "Avorbam",
    "Beaulieu",
    "Cap Estérias",
    "Cap Santa Clara",
    "Delta Postal",
    "Entraco",
    "Gigi",
    "La Sablière",
    "Okala",
    "Sherko",
  ],
  Owendo: [
    "Carrefour SNI",
    "CHUO",
    "Cité COMILOG",
    "Cité OCTRA",
    "Cité SNI",
    "Lowé",
    "Lycée technique",
    "Owendo 1",
    "Owendo 2",
    "Port",
    "Zone industrielle",
  ],
  "Port-Gentil": [
    "Aéroport",
    "Cap Lopez",
    "Centre-ville",
    "Cité Sogara",
    "La Balise",
    "La Mosquée",
    "Le Château",
    "Le Grand Village",
    "Ntchengue",
    "Port",
    "Quartier Chic",
    "Quartier Sud",
    "Romb’intchozo",
    "Zone industrielle",
  ],
  Franceville: [
    "Aérodrome",
    "Centre-ville",
    "Cité Comilog",
    "Lekedi",
    "Marché",
    "Mbaya",
    "Ngoungou",
    "Ombélé",
    "Ondili",
    "Ongali",
    "Potos",
    "Université",
  ],
  Oyem: [
    "Adzap",
    "Aérodrome",
    "Angone",
    "Centre-ville",
    "Ebe",
    "Lycée",
    "Marché",
    "Nkoumadjape",
    "Stade",
  ],
  Moanda: [
    "Aérodrome",
    "Bakoumba",
    "Centre-ville",
    "Cité Comilog",
    "Lekedi",
    "Marché",
    "Plateau",
  ],
  "Lambaréné": [
    "Abongo",
    "Adouma",
    "Agnindzoume",
    "Atongowanga",
    "Atsie",
    "Carrière",
    "Centre-ville",
    "Château",
    "Dakar",
    "Faisceaux",
    "Grand Village I",
    "Grand Village II",
    "Lalala",
    "Magnang",
    "Malebe",
    "Mbilanzambi",
    "Metere",
    "Mitoumli",
    "Moussamoukougou",
    "Petit Paris I",
    "Petit Paris II",
    "Petit Paris III",
    "Point V",
    "Sainte-Thérèse",
  ],
  Mouila: ["Centre-ville", "Dakar", "Grand Village", "Lycée", "Marché", "Stade"],
  Tchibanga: ["Aérodrome", "Centre-ville", "Dakar", "Grand Village", "Marché"],
  Makokou: ["Aérodrome", "Centre-ville", "Ivindo", "Marché"],
  Koulamoutou: ["Aérodrome", "Centre-ville", "Marché"],
  Bitam: ["Centre-ville", "Frontière", "Marché"],
  Ntoum: ["Centre-ville", "Marché", "PK", "Zone industrielle"],
  Gamba: ["Aéroport", "Centre-ville", "Port", "Shell"],
  Lastoursville: ["Centre-ville", "Gare", "Marché"],
  Mayumba: ["Centre-ville", "Plage", "Port"],
  Ndendé: ["Centre-ville", "Marché"],
  Okondja: ["Centre-ville", "Marché"],
  Mitzic: ["Centre-ville", "Marché"],
  Ndjolé: ["Centre-ville", "Gare", "Marché"],
  Fougamou: ["Centre-ville", "Marché"],
  Booué: ["Centre-ville", "Gare", "Marché"],
  Cocobeach: ["Centre-ville", "Plage", "Port"],
};

function normalizeCityKey(city: string): string {
  return city.trim().replace(/\s+/g, " ");
}

export function gaQuartiersForCity(city: string): string[] {
  const key = normalizeCityKey(city);
  if (!key) return [];
  const exact = GA_QUARTIERS_BY_CITY[key];
  if (exact) return exact;
  const found = Object.entries(GA_QUARTIERS_BY_CITY).find(
    ([name]) => name.toLowerCase() === key.toLowerCase()
  );
  return found?.[1] ?? [];
}

export function composeGaServiceCity(city: string, quartier: string): string {
  const c = normalizeCityKey(city);
  const q = quartier.trim();
  if (!c) return "";
  if (!q) return c;
  return `${c}${GA_CITY_QUARTIER_SEP}${q}`;
}

export function parseGaServiceCity(raw: string): {
  city: string;
  quartier: string;
} {
  const value = (raw || "").trim();
  const sep = GA_CITY_QUARTIER_SEP;
  const idx = value.indexOf(sep);
  if (idx === -1) return { city: value, quartier: "" };
  return {
    city: value.slice(0, idx).trim(),
    quartier: value.slice(idx + sep.length).trim(),
  };
}

export function resolveGaQuartier(selected: string, custom: string): string {
  if (selected === GA_QUARTIER_OTHER) return custom.trim();
  if (selected.trim()) return selected.trim();
  return custom.trim();
}
