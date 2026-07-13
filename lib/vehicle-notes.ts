/**
 * Encode / decode road-vehicle fields for particulier + ROAD trips
 * without a Prisma schema change (stored in Trip.notes).
 */

const MARKER = "[[RFACTO_VEHICLE]]";

export type VehicleDetails = {
  plate: string;
  licenseNumber: string;
  photoUrl: string;
};

export function encodeNotesWithVehicle(
  userNotes: string | undefined,
  vehicle: VehicleDetails | null
): string | undefined {
  const notes = (userNotes ?? "").trim();
  if (!vehicle) return notes || undefined;
  const block = [
    MARKER,
    `plate=${vehicle.plate.trim()}`,
    `license=${vehicle.licenseNumber.trim()}`,
    `photo=${vehicle.photoUrl.trim()}`,
    MARKER,
  ].join("\n");
  return notes ? `${block}\n${notes}` : block;
}

export function parseVehicleFromNotes(
  notes: string | null | undefined
): { vehicle: VehicleDetails | null; userNotes: string } {
  if (!notes) return { vehicle: null, userNotes: "" };
  const start = notes.indexOf(MARKER);
  if (start < 0) return { vehicle: null, userNotes: notes };
  const afterStart = start + MARKER.length;
  const end = notes.indexOf(MARKER, afterStart);
  if (end < 0) return { vehicle: null, userNotes: notes };
  const block = notes.slice(afterStart, end).trim();
  const userNotes = notes.slice(end + MARKER.length).trim();
  const map: Record<string, string> = {};
  for (const line of block.split("\n")) {
    const i = line.indexOf("=");
    if (i > 0) map[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  if (!map.plate && !map.license && !map.photo) {
    return { vehicle: null, userNotes: notes };
  }
  return {
    vehicle: {
      plate: map.plate ?? "",
      licenseNumber: map.license ?? "",
      photoUrl: map.photo ?? "",
    },
    userNotes,
  };
}
