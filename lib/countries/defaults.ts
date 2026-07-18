import type {
  CountryFeatures,
  CountryPayment,
  ServiceCategory,
} from "@/lib/countries/types";
import type { TransportMode } from "@/lib/transport";

export const DEFAULT_SERVICES: ServiceCategory[] = [
  "colis",
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

export const SERVICE_LABELS_FR: Record<ServiceCategory, string> = {
  colis: "Colis & mobilité",
  transport: "Transport",
  transitaire: "Transit / logistique",
  hotel: "Hébergement",
  autre: "Autres services",
};

export const SERVICE_LABELS_EN: Record<ServiceCategory, string> = {
  colis: "Parcels & mobility",
  transport: "Transport",
  transitaire: "Freight / logistics",
  hotel: "Stay / lodging",
  autre: "Other services",
};
