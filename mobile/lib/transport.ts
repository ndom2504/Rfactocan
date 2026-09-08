export type TransportMode = "AIR" | "SEA" | "RAIL" | "ROAD";

export const TRANSPORT_MODES: {
  code: TransportMode;
  labelFr: string;
  labelEn: string;
}[] = [
  { code: "AIR", labelFr: "Aérien", labelEn: "Air" },
  { code: "RAIL", labelFr: "Ferroviaire", labelEn: "Rail" },
  { code: "SEA", labelFr: "Maritime", labelEn: "Sea" },
  { code: "ROAD", labelFr: "Terrestre", labelEn: "Land" },
];

export type TransportTypeOption = {
  code: string;
  labelFr: string;
  labelEn: string;
};

export const TRANSPORT_TYPES_BY_MODE: Record<TransportMode, TransportTypeOption[]> = {
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

export function normalizeTransportMode(value?: string | null): TransportMode {
  const v = (value || "AIR").toUpperCase();
  if (v === "SEA" || v === "RAIL" || v === "ROAD" || v === "AIR") return v;
  return "AIR";
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
