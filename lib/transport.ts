export type TransportMode = "AIR" | "SEA" | "RAIL" | "ROAD";

export const TRANSPORT_MODES: {
  code: TransportMode;
  labelFr: string;
  labelEn: string;
}[] = [
  { code: "AIR", labelFr: "Avion", labelEn: "Air" },
  { code: "SEA", labelFr: "Maritime", labelEn: "Sea" },
  { code: "RAIL", labelFr: "Ferroviaire", labelEn: "Rail" },
  { code: "ROAD", labelFr: "Terrestre (route)", labelEn: "Road" },
];

export function transportModeLabel(
  mode: string | null | undefined,
  locale: "fr" | "en" = "fr"
) {
  const found = TRANSPORT_MODES.find((m) => m.code === mode);
  if (!found) return locale === "en" ? "Air" : "Avion";
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
