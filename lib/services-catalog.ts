/**
 * Catalogue des catégories et métiers (colis + services collaboratifs).
 */

export const SERVICE_CATEGORIES = [
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
    hintFr: "Cérémonies et animations",
    hintEn: "Ceremonies and hosting",
    isParcel: false,
    types: [
      {
        id: "maitre_ceremonie",
        labelFr: "Maître de cérémonie",
        labelEn: "Master of ceremonies",
      },
    ],
  },
  {
    id: "transport",
    labelFr: "Transport",
    labelEn: "Transport",
    hintFr: "Courses et déplacements locaux",
    hintEn: "Rides and local transport",
    isParcel: false,
    types: [
      { id: "course", labelFr: "Course / taxi", labelEn: "Ride / taxi" },
      { id: "location", labelFr: "Location véhicule", labelEn: "Vehicle rental" },
    ],
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
  const t = getServiceType(categoryId, typeId);
  if (!t) return typeId;
  return locale === "en" ? t.labelEn : t.labelFr;
}
