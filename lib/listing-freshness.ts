import type { Prisma } from "@prisma/client";

/** Start of the current UTC calendar day. Listings stay visible through their travel day. */
export function startOfTodayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Public trips whose departure or arrival is still today or later.
 * Editing the dates (PATCH) is enough to bring a listing back — no extra flag.
 */
export function openTripDateWhere(): Prisma.TripWhereInput {
  const today = startOfTodayUtc();
  return {
    OR: [{ arriveAt: { gte: today } }, { departAt: { gte: today } }],
  };
}

/**
 * Hide parcel requests whose desired date is before today.
 * Jobs / services / products and parcels without a date stay visible.
 */
export function openRequestDateWhere(): Prisma.ParcelRequestWhereInput {
  const today = startOfTodayUtc();
  return {
    OR: [
      { needType: { not: "PARCEL" } },
      { desiredDate: null },
      { desiredDate: { gte: today } },
    ],
  };
}
