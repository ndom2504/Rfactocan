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
