/**
 * Encode / decode carrier details in Trip.notes (no Prisma migration).
 * Particulier ROAD → vehicle block; commercial → company block.
 */

const VEHICLE_MARKER = "[[RFACTO_VEHICLE]]";
const COMMERCIAL_MARKER = "[[RFACTO_COMMERCIAL]]";

export type VehicleDetails = {
  plate: string;
  licenseNumber: string;
  photoUrl: string;
};

export type CommercialDetails = {
  company: string;
  matricule: string;
  insurance: string;
  base: string;
};

function parseBlock(
  notes: string,
  marker: string
): { map: Record<string, string>; rest: string } | null {
  const start = notes.indexOf(marker);
  if (start < 0) return null;
  const afterStart = start + marker.length;
  const end = notes.indexOf(marker, afterStart);
  if (end < 0) return null;
  const block = notes.slice(afterStart, end).trim();
  const before = notes.slice(0, start).trim();
  const after = notes.slice(end + marker.length).trim();
  const rest = [before, after].filter(Boolean).join("\n").trim();
  const map: Record<string, string> = {};
  for (const line of block.split("\n")) {
    const i = line.indexOf("=");
    if (i > 0) map[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { map, rest };
}

function encodeBlock(marker: string, pairs: Record<string, string>): string {
  const lines = Object.entries(pairs)
    .filter(([, v]) => v.trim())
    .map(([k, v]) => `${k}=${v.trim()}`);
  return [marker, ...lines, marker].join("\n");
}

export function encodeNotesWithVehicle(
  userNotes: string | undefined,
  vehicle: VehicleDetails | null
): string | undefined {
  const notes = (userNotes ?? "").trim();
  if (!vehicle) return notes || undefined;
  const block = encodeBlock(VEHICLE_MARKER, {
    plate: vehicle.plate,
    license: vehicle.licenseNumber,
    photo: vehicle.photoUrl,
  });
  return notes ? `${block}\n${notes}` : block;
}

export function encodeNotesWithCommercial(
  userNotes: string | undefined,
  commercial: CommercialDetails | null
): string | undefined {
  const notes = (userNotes ?? "").trim();
  if (!commercial) return notes || undefined;
  const block = encodeBlock(COMMERCIAL_MARKER, {
    company: commercial.company,
    matricule: commercial.matricule,
    insurance: commercial.insurance,
    base: commercial.base,
  });
  return notes ? `${block}\n${notes}` : block;
}

export function parseVehicleFromNotes(
  notes: string | null | undefined
): { vehicle: VehicleDetails | null; userNotes: string } {
  if (!notes) return { vehicle: null, userNotes: "" };
  const parsed = parseBlock(notes, VEHICLE_MARKER);
  if (!parsed) return { vehicle: null, userNotes: notes };
  const { map, rest } = parsed;
  if (!map.plate && !map.license && !map.photo) {
    return { vehicle: null, userNotes: notes };
  }
  return {
    vehicle: {
      plate: map.plate ?? "",
      licenseNumber: map.license ?? "",
      photoUrl: map.photo ?? "",
    },
    userNotes: rest,
  };
}

export function parseCommercialFromNotes(
  notes: string | null | undefined
): { commercial: CommercialDetails | null; userNotes: string } {
  if (!notes) return { commercial: null, userNotes: "" };
  const parsed = parseBlock(notes, COMMERCIAL_MARKER);
  if (!parsed) return { commercial: null, userNotes: notes };
  const { map, rest } = parsed;
  if (!map.company && !map.matricule && !map.insurance && !map.base) {
    return { commercial: null, userNotes: notes };
  }
  return {
    commercial: {
      company: map.company ?? "",
      matricule: map.matricule ?? "",
      insurance: map.insurance ?? "",
      base: map.base ?? "",
    },
    userNotes: rest,
  };
}

/** Strip encoded blocks; return human notes + structured carrier info. */
export function parseCarrierFromNotes(notes: string | null | undefined): {
  vehicle: VehicleDetails | null;
  commercial: CommercialDetails | null;
  userNotes: string;
} {
  if (!notes) return { vehicle: null, commercial: null, userNotes: "" };
  const v = parseVehicleFromNotes(notes);
  const c = parseCommercialFromNotes(v.userNotes);
  return {
    vehicle: v.vehicle,
    commercial: c.commercial,
    userNotes: c.userNotes,
  };
}
