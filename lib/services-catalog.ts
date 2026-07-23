/**
 * Catalogue des catégories et métiers (colis + services collaboratifs).
 */

import {
  TRANSPORT_MODES,
  TRANSPORT_TYPES_BY_MODE,
  transportModeLabel,
  transportTypeLabel,
  type TransportMode,
} from "@/lib/transport";

export const SERVICE_CATEGORIES = [
  "colis",
  "hebergement",
  "maison",
  "artisanat",
  "beaute",
  "famille",
  "evenements",
  "sport",
  "vente",
  "informatique",
  "transport",
  "transitaire",
  "autre",
] as const;

export type ServiceCategoryId = (typeof SERVICE_CATEGORIES)[number];

export type ServiceTypeDef = {
  id: string;
  labelFr: string;
  labelEn: string;
};

export type ServiceCategoryDef = {
  id: ServiceCategoryId;
  labelFr: string;
  labelEn: string;
  hintFr: string;
  hintEn: string;
  /** Si true, renvoie vers les flux colis existants. */
  isParcel: boolean;
  types: ServiceTypeDef[];
};

/** Types locaux ajoutés au mode route (courses / location). */
const ROAD_SERVICE_EXTRAS: ServiceTypeDef[] = [
  { id: "TAXI", labelFr: "Taxi / course", labelEn: "Taxi / ride" },
  { id: "RENTAL", labelFr: "Location véhicule", labelEn: "Vehicle rental" },
  {
    id: "DRIVER",
    labelFr: "Chauffeur privé",
    labelEn: "Private driver",
  },
];

export function encodeTransportServiceType(
  mode: TransportMode,
  typeCode: string
): string {
  return `${mode}_${typeCode.toUpperCase()}`;
}

export function parseTransportServiceType(serviceType: string): {
  mode: TransportMode;
  typeCode: string;
} | null {
  const raw = (serviceType || "").trim().toUpperCase();
  const modes: TransportMode[] = ["AIR", "SEA", "RAIL", "ROAD"];
  for (const mode of modes) {
    const prefix = `${mode}_`;
    if (raw.startsWith(prefix)) {
      return { mode, typeCode: raw.slice(prefix.length) };
    }
  }
  // Legacy flat ids
  if (raw === "COURSE" || raw === "TAXI") {
    return { mode: "ROAD", typeCode: "TAXI" };
  }
  if (raw === "LOCATION" || raw === "RENTAL") {
    return { mode: "ROAD", typeCode: "RENTAL" };
  }
  return null;
}

export function transportServiceTypesForMode(
  mode: TransportMode
): ServiceTypeDef[] {
  const base = TRANSPORT_TYPES_BY_MODE[mode].map((t) => ({
    id: t.code,
    labelFr: t.labelFr,
    labelEn: t.labelEn,
  }));
  if (mode === "ROAD") {
    return [...ROAD_SERVICE_EXTRAS, ...base];
  }
  return base;
}

function buildTransportTypes(): ServiceTypeDef[] {
  return TRANSPORT_MODES.flatMap((m) =>
    transportServiceTypesForMode(m.code).map((t) => ({
      id: encodeTransportServiceType(m.code, t.id),
      labelFr: `${m.labelFr} — ${t.labelFr}`,
      labelEn: `${m.labelEn} — ${t.labelEn}`,
    }))
  );
}

export const SERVICE_CATALOG: ServiceCategoryDef[] = [
  {
    id: "colis",
    labelFr: "Colis & mobilité",
    labelEn: "Parcels & mobility",
    hintFr: "Envoyer, recevoir ou proposer un trajet",
    hintEn: "Send, receive or offer a trip",
    isParcel: true,
    types: [
      { id: "envoi", labelFr: "Envoyer un colis", labelEn: "Send a parcel" },
      {
        id: "reception",
        labelFr: "Recevoir un colis",
        labelEn: "Receive a parcel",
      },
      {
        id: "trajet",
        labelFr: "Proposer un trajet",
        labelEn: "Offer a trip",
      },
    ],
  },
  {
    id: "hebergement",
    labelFr: "Hébergement",
    labelEn: "Lodging",
    hintFr: "Hôtel, chambre, logement temporaire",
    hintEn: "Hotel, room, short stay",
    isParcel: false,
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
    hintFr: "Nettoyage, peinture et entretien",
    hintEn: "Cleaning, painting and upkeep",
    isParcel: false,
    types: [
      { id: "nettoyage", labelFr: "Nettoyage", labelEn: "Cleaning" },
      { id: "peintre", labelFr: "Peintre", labelEn: "Painter" },
    ],
  },
  {
    id: "artisanat",
    labelFr: "Artisanat",
    labelEn: "Trades",
    hintFr: "Maçon, menuisier et travaux",
    hintEn: "Mason, carpenter and works",
    isParcel: false,
    types: [
      { id: "macon", labelFr: "Maçon", labelEn: "Mason" },
      { id: "menuisier", labelFr: "Menuisier", labelEn: "Carpenter" },
    ],
  },
  {
    id: "beaute",
    labelFr: "Beauté & bien-être",
    labelEn: "Beauty & wellness",
    hintFr: "Coiffure et soins",
    hintEn: "Hair and care",
    isParcel: false,
    types: [{ id: "coiffure", labelFr: "Coiffure", labelEn: "Hairdressing" }],
  },
  {
    id: "famille",
    labelFr: "Famille",
    labelEn: "Family",
    hintFr: "Aide à domicile et garde",
    hintEn: "Home help and childcare",
    isParcel: false,
    types: [{ id: "nounou", labelFr: "Nounou", labelEn: "Nanny" }],
  },
  {
    id: "evenements",
    labelFr: "Événements",
    labelEn: "Events",
    hintFr: "Cérémonies, animations et prestataires",
    hintEn: "Ceremonies, hosting and vendors",
    isParcel: false,
    types: [
      {
        id: "maitre_ceremonie",
        labelFr: "Maître de cérémonie",
        labelEn: "Master of ceremonies",
      },
      { id: "hotesse", labelFr: "Hôtesse", labelEn: "Hostess" },
      {
        id: "agence_hotesses",
        labelFr: "Agence d'hôtesses",
        labelEn: "Hostess agency",
      },
      { id: "decoration", labelFr: "Décoration", labelEn: "Decoration" },
      { id: "dj", labelFr: "DJ", labelEn: "DJ" },
      {
        id: "location_sono",
        labelFr: "Location sono",
        labelEn: "Sound system rental",
      },
      { id: "photographe", labelFr: "Photographe", labelEn: "Photographer" },
      {
        id: "salle_mariage",
        labelFr: "Salle de mariage",
        labelEn: "Wedding hall",
      },
      {
        id: "traiteur",
        labelFr: "Traiteur",
        labelEn: "Caterer",
      },
      {
        id: "videographe",
        labelFr: "Vidéaste",
        labelEn: "Videographer",
      },
    ],
  },
  {
    id: "sport",
    labelFr: "Sport & bien-être",
    labelEn: "Sport & wellness",
    hintFr: "Coach, entraîneur, kiné, massage et préparation physique",
    hintEn: "Coach, trainer, physio, massage and conditioning",
    isParcel: false,
    types: [
      {
        id: "coach_sportif",
        labelFr: "Coach sportif",
        labelEn: "Sports coach",
      },
      {
        id: "entraineur",
        labelFr: "Entraîneur",
        labelEn: "Trainer / coach",
      },
      {
        id: "preparateur_physique",
        labelFr: "Préparateur physique",
        labelEn: "Strength & conditioning coach",
      },
      {
        id: "masseur",
        labelFr: "Masseur / masseuse",
        labelEn: "Massage therapist",
      },
      {
        id: "kine",
        labelFr: "Kinésithérapeute",
        labelEn: "Physiotherapist",
      },
      {
        id: "yoga_pilates",
        labelFr: "Yoga / Pilates",
        labelEn: "Yoga / Pilates",
      },
      {
        id: "fitness",
        labelFr: "Fitness / musculation",
        labelEn: "Fitness / gym",
      },
      {
        id: "arts_martiaux",
        labelFr: "Arts martiaux",
        labelEn: "Martial arts",
      },
      {
        id: "natation",
        labelFr: "Natation",
        labelEn: "Swimming",
      },
      {
        id: "autre_sport",
        labelFr: "Autre service sportif",
        labelEn: "Other sports service",
      },
    ],
  },
  {
    id: "vente",
    labelFr: "Vente & commerce",
    labelEn: "Sales & retail",
    hintFr: "Filtrez par secteur puis par produit(s)",
    hintEn: "Filter by sector then by product(s)",
    isParcel: false,
    types: [
      {
        id: "alimentaire",
        labelFr: "Alimentaire",
        labelEn: "Food & grocery",
      },
      {
        id: "mode_textile",
        labelFr: "Mode & textile",
        labelEn: "Fashion & textile",
      },
      {
        id: "electronique",
        labelFr: "Électronique",
        labelEn: "Electronics",
      },
      {
        id: "telephone_accessoires",
        labelFr: "Téléphonie & accessoires",
        labelEn: "Phones & accessories",
      },
      {
        id: "auto_moto",
        labelFr: "Auto / moto",
        labelEn: "Auto / moto",
      },
      {
        id: "immobilier",
        labelFr: "Immobilier",
        labelEn: "Real estate",
      },
      {
        id: "cosmetique_beaute",
        labelFr: "Cosmétique & beauté",
        labelEn: "Cosmetics & beauty",
      },
      {
        id: "maison_deco",
        labelFr: "Maison & déco",
        labelEn: "Home & décor",
      },
      {
        id: "agriculture",
        labelFr: "Agriculture",
        labelEn: "Agriculture",
      },
      {
        id: "services_b2b",
        labelFr: "Vente B2B / fournitures",
        labelEn: "B2B / supplies",
      },
      {
        id: "artisanat_vente",
        labelFr: "Artisanat & faits main",
        labelEn: "Crafts & handmade",
      },
      {
        id: "autre_vente",
        labelFr: "Autre secteur",
        labelEn: "Other sector",
      },
    ],
  },
  {
    id: "informatique",
    labelFr: "Informatique & design",
    labelEn: "IT & design",
    hintFr: "Services informatiques, infographie, web et numérique",
    hintEn: "IT support, graphic design, web and digital services",
    isParcel: false,
    types: [
      {
        id: "depannage_info",
        labelFr: "Dépannage informatique",
        labelEn: "IT support / repair",
      },
      {
        id: "installation_logiciels",
        labelFr: "Installation & configuration",
        labelEn: "Software setup",
      },
      {
        id: "reseaux",
        labelFr: "Réseaux & internet",
        labelEn: "Networks & internet",
      },
      {
        id: "assistance_bureautique",
        labelFr: "Assistance bureautique",
        labelEn: "Office IT help",
      },
      {
        id: "formation_informatique",
        labelFr: "Formation informatique",
        labelEn: "IT training",
      },
      {
        id: "developpement_web",
        labelFr: "Développement web",
        labelEn: "Web development",
      },
      {
        id: "developpement_mobile",
        labelFr: "Développement mobile",
        labelEn: "Mobile development",
      },
      {
        id: "infographie",
        labelFr: "Infographie",
        labelEn: "Infographics",
      },
      {
        id: "design_graphique",
        labelFr: "Design graphique / logo",
        labelEn: "Graphic design / logo",
      },
      {
        id: "pao_impression",
        labelFr: "PAO & impression",
        labelEn: "DTP & print",
      },
      {
        id: "montage_video",
        labelFr: "Montage vidéo",
        labelEn: "Video editing",
      },
      {
        id: "community_management",
        labelFr: "Community management",
        labelEn: "Community management",
      },
      {
        id: "autre_numerique",
        labelFr: "Autre service numérique",
        labelEn: "Other digital service",
      },
    ],
  },
  {
    id: "transport",
    labelFr: "Transport",
    labelEn: "Transport",
    hintFr: "Mode (air, mer, rail, route) puis type de véhicule",
    hintEn: "Mode (air, sea, rail, road) then vehicle type",
    isParcel: false,
    types: buildTransportTypes(),
  },
  {
    id: "transitaire",
    labelFr: "Transit / logistique",
    labelEn: "Freight / logistics",
    hintFr: "Transitaires et logistique",
    hintEn: "Forwarders and logistics",
    isParcel: false,
    types: [
      {
        id: "transitaire",
        labelFr: "Transitaire",
        labelEn: "Freight forwarder",
      },
    ],
  },
  {
    id: "autre",
    labelFr: "Autres services",
    labelEn: "Other services",
    hintFr: "Tout autre service utile",
    hintEn: "Any other useful service",
    isParcel: false,
    types: [{ id: "autre", labelFr: "Autre", labelEn: "Other" }],
  },
];

export const PRICE_UNITS = [
  { id: "forfait", labelFr: "Forfait", labelEn: "Flat fee" },
  { id: "heure", labelFr: "Par heure", labelEn: "Per hour" },
  { id: "jour", labelFr: "Par jour", labelEn: "Per day" },
  { id: "nuit", labelFr: "Par nuit", labelEn: "Per night" },
] as const;

export type PriceUnitId = (typeof PRICE_UNITS)[number]["id"];

/** Produits suggérés par secteur de vente (serviceType de la catégorie `vente`). */
export const SALE_PRODUCTS_BY_SECTOR: Record<string, ServiceTypeDef[]> = {
  alimentaire: [
    { id: "fruits", labelFr: "Fruits", labelEn: "Fruit" },
    { id: "legumes", labelFr: "Légumes", labelEn: "Vegetables" },
    { id: "viande", labelFr: "Viande", labelEn: "Meat" },
    { id: "poisson", labelFr: "Poisson", labelEn: "Fish" },
    { id: "epicerie", labelFr: "Épicerie", labelEn: "Grocery" },
    { id: "boissons", labelFr: "Boissons", labelEn: "Beverages" },
  ],
  mode_textile: [
    { id: "vetements", labelFr: "Vêtements", labelEn: "Clothing" },
    { id: "chaussures", labelFr: "Chaussures", labelEn: "Shoes" },
    { id: "accessoires_mode", labelFr: "Accessoires", labelEn: "Accessories" },
    { id: "tissus", labelFr: "Tissus", labelEn: "Fabrics" },
  ],
  electronique: [
    { id: "ordinateurs", labelFr: "Ordinateurs", labelEn: "Computers" },
    { id: "tv_audio", labelFr: "TV / audio", labelEn: "TV / audio" },
    { id: "electromenager", labelFr: "Électroménager", labelEn: "Appliances" },
  ],
  telephone_accessoires: [
    { id: "smartphones", labelFr: "Smartphones", labelEn: "Smartphones" },
    { id: "accessoires_tel", labelFr: "Accessoires téléphone", labelEn: "Phone accessories" },
    { id: "reparation_tel", labelFr: "Réparation téléphone", labelEn: "Phone repair" },
  ],
  auto_moto: [
    { id: "pieces_auto", labelFr: "Pièces auto", labelEn: "Car parts" },
    { id: "pieces_moto", labelFr: "Pièces moto", labelEn: "Moto parts" },
    { id: "vehicules", labelFr: "Véhicules", labelEn: "Vehicles" },
  ],
  immobilier: [
    { id: "location", labelFr: "Location", labelEn: "Rental" },
    { id: "vente_bien", labelFr: "Vente de bien", labelEn: "Property sale" },
    { id: "terrain", labelFr: "Terrain", labelEn: "Land" },
  ],
  cosmetique_beaute: [
    { id: "soins", labelFr: "Soins", labelEn: "Skincare" },
    { id: "maquillage", labelFr: "Maquillage", labelEn: "Makeup" },
    { id: "parfums", labelFr: "Parfums", labelEn: "Perfume" },
  ],
  maison_deco: [
    { id: "meubles", labelFr: "Meubles", labelEn: "Furniture" },
    { id: "decoration", labelFr: "Décoration", labelEn: "Decoration" },
    { id: "ustensiles", labelFr: "Ustensiles", labelEn: "Kitchenware" },
  ],
  agriculture: [
    { id: "semences", labelFr: "Semences", labelEn: "Seeds" },
    { id: "engrais", labelFr: "Engrais", labelEn: "Fertilizer" },
    { id: "materiel_agricole", labelFr: "Matériel agricole", labelEn: "Farm equipment" },
  ],
  services_b2b: [
    { id: "fournitures_bureau", labelFr: "Fournitures de bureau", labelEn: "Office supplies" },
    { id: "equipements", labelFr: "Équipements", labelEn: "Equipment" },
    { id: "gros", labelFr: "Vente en gros", labelEn: "Wholesale" },
  ],
  artisanat_vente: [
    { id: "bijoux", labelFr: "Bijoux", labelEn: "Jewelry" },
    { id: "artisanat_local", labelFr: "Artisanat local", labelEn: "Local crafts" },
    { id: "faits_main", labelFr: "Faits main", labelEn: "Handmade" },
  ],
  autre_vente: [
    { id: "divers", labelFr: "Divers", labelEn: "Miscellaneous" },
  ],
};

export function saleProductsForSector(sectorId: string): ServiceTypeDef[] {
  return SALE_PRODUCTS_BY_SECTOR[sectorId] ?? SALE_PRODUCTS_BY_SECTOR.autre_vente;
}

export function parseProductsJson(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20);
  }
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    return parseProductsJson(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function productLabel(
  sectorId: string,
  productId: string,
  locale: "fr" | "en" = "fr"
): string {
  const found = saleProductsForSector(sectorId).find((p) => p.id === productId);
  if (found) return locale === "en" ? found.labelEn : found.labelFr;
  return productId;
}

export function getCategory(id: string): ServiceCategoryDef | undefined {
  return SERVICE_CATALOG.find((c) => c.id === id);
}

export function getServiceType(
  categoryId: string,
  typeId: string
): ServiceTypeDef | undefined {
  return getCategory(categoryId)?.types.find((t) => t.id === typeId);
}

export function isServiceCategoryId(id: string): id is ServiceCategoryId {
  return (SERVICE_CATEGORIES as readonly string[]).includes(id);
}

export function categoryLabel(
  id: string,
  locale: "fr" | "en" = "fr"
): string {
  const c = getCategory(id);
  if (!c) return id;
  return locale === "en" ? c.labelEn : c.labelFr;
}

export function serviceTypeLabel(
  categoryId: string,
  typeId: string,
  locale: "fr" | "en" = "fr"
): string {
  if (categoryId === "transport") {
    const parsed = parseTransportServiceType(typeId);
    if (parsed) {
      const modeLabel = transportModeLabel(parsed.mode, locale);
      const typeLabel = transportServiceTypesForMode(parsed.mode).find(
        (t) => t.id === parsed.typeCode
      );
      if (typeLabel) {
        const tl = locale === "en" ? typeLabel.labelEn : typeLabel.labelFr;
        return `${modeLabel} — ${tl}`;
      }
      return `${modeLabel} — ${transportTypeLabel(parsed.mode, parsed.typeCode, locale)}`;
    }
  }
  const t = getServiceType(categoryId, typeId);
  if (!t) return typeId;
  return locale === "en" ? t.labelEn : t.labelFr;
}
