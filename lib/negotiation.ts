/** Booking statuses that count as an active negotiation / discussion. */
export const DISCUSSION_STATUSES = [
  "PROPOSED",
  "AWAITING_PAYMENT",
] as const;

export function effectivePricePerKg(booking: {
  offeredPricePerKg?: number | null;
  trip: { pricePerKgCad: number };
}) {
  if (
    booking.offeredPricePerKg != null &&
    Number.isFinite(booking.offeredPricePerKg) &&
    booking.offeredPricePerKg > 0
  ) {
    return booking.offeredPricePerKg;
  }
  return booking.trip.pricePerKgCad;
}

export function negotiationLabel(input: {
  priceNegotiable: boolean;
  discussionCount: number;
  locale?: "fr" | "en";
}) {
  const fr = (input.locale ?? "fr") === "fr";
  if (!input.priceNegotiable) {
    return fr ? "Prix fixe" : "Fixed price";
  }
  if (input.discussionCount <= 0) {
    return fr ? "Négociable" : "Negotiable";
  }
  const n = input.discussionCount;
  if (fr) {
    return n === 1
      ? "En négociation · 1 personne"
      : `En négociation · ${n} personnes`;
  }
  return n === 1
    ? "In negotiation · 1 person"
    : `In negotiation · ${n} people`;
}
