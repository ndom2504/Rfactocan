import type {
  CountryFeatures,
  CountryPayment,
  ServiceCategory,
} from "@/lib/countries/types";
import type { TransportMode } from "@/lib/transport";

/** Catégories activées par défaut (pays sans config dédiée). */
export const DEFAULT_SERVICES: ServiceCategory[] = [
  "colis",
  "hebergement",
  "maison",
  "artisanat",
  "beaute",
  "famille",
  "evenements",
  "transport",
  "autre",
];

export const DEFAULT_PAYMENTS: CountryPayment[] = ["stripe", "bank"];

export const DEFAULT_TRANSPORT_MODES: TransportMode[] = [
  "AIR",
  "ROAD",
  "SEA",
  "RAIL",
];

export const DEFAULT_FEATURES: CountryFeatures = {
  kycRequired: true,
  escrow: true,
};

/** @deprecated Préférer `categoryLabel` dans services-catalog. */
export const SERVICE_LABELS_FR: Record<string, string> = {
  colis: "Colis & mobilité",
  hebergement: "Hébergement",
  maison: "Maison & entretien",
  artisanat: "Artisanat",
  beaute: "Beauté & bien-être",
  famille: "Famille",
  evenements: "Événements",
  transport: "Transport",
  transitaire: "Transit / logistique",
  hotel: "Hébergement",
  autre: "Autres services",
};

export const SERVICE_LABELS_EN: Record<string, string> = {
  colis: "Parcels & mobility",
  hebergement: "Lodging",
  maison: "Home & upkeep",
  artisanat: "Trades",
  beaute: "Beauty & wellness",
  famille: "Family",
  evenements: "Events",
  transport: "Transport",
  transitaire: "Freight / logistics",
  hotel: "Lodging",
  autre: "Other services",
};
