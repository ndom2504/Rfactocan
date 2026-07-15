export type TransportMode = "AIR" | "SEA" | "RAIL" | "ROAD";

export const TRANSPORT_MODES: {
  code: TransportMode;
  labelFr: string;
  labelEn: string;
}[] = [
  { code: "AIR", labelFr: "Aérien", labelEn: "Air" },
  { code: "SEA", labelFr: "Maritime", labelEn: "Sea" },
  { code: "RAIL", labelFr: "Ferroviaire", labelEn: "Rail" },
  { code: "ROAD", labelFr: "Terrestre (route)", labelEn: "Road" },
];

export type TransportTypeOption = {
  code: string;
  labelFr: string;
  labelEn: string;
};

/** Specific means filtered by transport mode. */
export const TRANSPORT_TYPES_BY_MODE: Record<
  TransportMode,
  TransportTypeOption[]
> = {
  AIR: [
    { code: "PLANE", labelFr: "Avion", labelEn: "Plane" },
    { code: "HELICOPTER", labelFr: "Hélicoptère", labelEn: "Helicopter" },
    { code: "CARGO_AIR", labelFr: "Cargo aérien", labelEn: "Air cargo" },
  ],
  SEA: [
    { code: "CARGO_SHIP", labelFr: "Cargo", labelEn: "Cargo ship" },
    { code: "FERRY", labelFr: "Ferry", labelEn: "Ferry" },
    { code: "CONTAINER", labelFr: "Porte-conteneurs", labelEn: "Container ship" },
    { code: "OUTBOARD", labelFr: "Hors-bord", labelEn: "Outboard boat" },
    { code: "PIROGUE", labelFr: "Pirogue", labelEn: "Pirogue" },
  ],
  RAIL: [
    { code: "PASSENGER_TRAIN", labelFr: "Train voyageurs", labelEn: "Passenger train" },
    { code: "FREIGHT_TRAIN", labelFr: "Train de fret", labelEn: "Freight train" },
  ],
  ROAD: [
    { code: "CAR", labelFr: "Voiture", labelEn: "Car" },
    { code: "VAN", labelFr: "Fourgonnette", labelEn: "Van" },
    { code: "TRUCK", labelFr: "Camion", labelEn: "Truck" },
    { code: "BUS", labelFr: "Bus", labelEn: "Bus" },
    { code: "MOTORCYCLE", labelFr: "Moto", labelEn: "Motorcycle" },
    { code: "BICYCLE", labelFr: "Vélo", labelEn: "Bicycle" },
    { code: "TRICYCLE", labelFr: "Tricycle", labelEn: "Tricycle" },
  ],
};

export function transportTypesForMode(mode: TransportMode): TransportTypeOption[] {
  return TRANSPORT_TYPES_BY_MODE[mode] ?? TRANSPORT_TYPES_BY_MODE.AIR;
}

export function defaultTransportType(mode: TransportMode): string {
  return transportTypesForMode(mode)[0]?.code ?? "PLANE";
}

export function normalizeTransportType(
  mode: TransportMode,
  value?: string | null
): string {
  const options = transportTypesForMode(mode);
  const code = (value || "").trim().toUpperCase();
  if (options.some((o) => o.code === code)) return code;
  return options[0]?.code ?? "PLANE";
}

export function transportTypeLabel(
  mode: TransportMode | string | null | undefined,
  type: string | null | undefined,
  locale: "fr" | "en" = "fr"
) {
  const m = normalizeTransportMode(mode);
  const found = transportTypesForMode(m).find((o) => o.code === type);
  if (!found) return type || "—";
  return locale === "en" ? found.labelEn : found.labelFr;
}

export function transportModeLabel(
  mode: string | null | undefined,
  locale: "fr" | "en" = "fr"
) {
  const found = TRANSPORT_MODES.find((m) => m.code === mode);
  if (!found) return locale === "en" ? "Air" : "Aérien";
  return locale === "en" ? found.labelEn : found.labelFr;
}

export function normalizeTransportMode(
  value?: string | null
): TransportMode {
  const v = (value || "AIR").toUpperCase();
  if (v === "SEA" || v === "RAIL" || v === "ROAD" || v === "AIR") return v;
  return "AIR";
}

/** Soft weight caps by mode (kg). */
export function maxWeightForMode(mode: TransportMode) {
  switch (mode) {
    case "SEA":
      return 5000;
    case "RAIL":
      return 2000;
    case "ROAD":
      return 1000;
    default:
      return 100;
  }
}

export function carrierFieldLabels(mode: TransportMode, locale: "fr" | "en" = "fr") {
  if (locale === "en") {
    switch (mode) {
      case "SEA":
        return {
          carrier: "Shipping line / vessel operator",
          reference: "Voyage / vessel name",
          fromHub: "Departure port (optional)",
          toHub: "Arrival port (optional)",
        };
      case "RAIL":
        return {
          carrier: "Rail operator",
          reference: "Train number",
          fromHub: "Departure station (optional)",
          toHub: "Arrival station (optional)",
        };
      case "ROAD":
        return {
          carrier: "Carrier / company",
          reference: "Vehicle / trip reference",
          fromHub: "Departure hub (optional)",
          toHub: "Arrival hub (optional)",
        };
      default:
        return {
          carrier: "Airline",
          reference: "Flight number",
          fromHub: "Departure airport",
          toHub: "Arrival airport",
        };
    }
  }

  switch (mode) {
    case "SEA":
      return {
        carrier: "Compagnie / armateur",
        reference: "N° voyage / nom du navire",
        fromHub: "Port de départ (optionnel)",
        toHub: "Port d'arrivée (optionnel)",
      };
    case "RAIL":
      return {
        carrier: "Opérateur ferroviaire",
        reference: "N° de train",
        fromHub: "Gare de départ (optionnel)",
        toHub: "Gare d'arrivée (optionnel)",
      };
    case "ROAD":
      return {
        carrier: "Transporteur / société",
        reference: "Réf. véhicule / trajet",
        fromHub: "Hub de départ (optionnel)",
        toHub: "Hub d'arrivée (optionnel)",
      };
    default:
      return {
        carrier: "Compagnie aérienne",
        reference: "N° de vol",
        fromHub: "Aéroport de départ",
        toHub: "Aéroport d'arrivée",
      };
  }
}
