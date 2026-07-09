import { prisma } from "@/lib/prisma";
import type { BookingStatus, Prisma } from "@prisma/client";

const STATUS_LABELS: Record<BookingStatus, string> = {
  PROPOSED: "Mise en relation",
  AWAITING_PAYMENT: "Paiement demandé",
  ACCEPTED: "Paiement confirmé",
  HANDED_OVER: "Colis remis au voyageur",
  IN_TRANSIT: "En transit",
  DELIVERED: "Livré",
  CANCELLED: "Annulé",
  REFUSED: "Refusé",
};

export function statusEventLabel(status: BookingStatus) {
  return STATUS_LABELS[status] ?? status;
}

export async function recordBookingEvent(
  tx: Prisma.TransactionClient | typeof prisma,
  input: {
    bookingId: string;
    type: string;
    label: string;
    status?: string | null;
    actorId?: string | null;
    meta?: Record<string, unknown>;
  }
) {
  return tx.bookingEvent.create({
    data: {
      bookingId: input.bookingId,
      type: input.type,
      label: input.label,
      status: input.status ?? null,
      actorId: input.actorId ?? null,
      metaJson: JSON.stringify(input.meta ?? {}),
    },
  });
}

export async function recordStatusChange(input: {
  bookingId: string;
  status: BookingStatus;
  actorId?: string | null;
  meta?: Record<string, unknown>;
}) {
  return recordBookingEvent(prisma, {
    bookingId: input.bookingId,
    type: "STATUS",
    status: input.status,
    label: statusEventLabel(input.status),
    actorId: input.actorId,
    meta: input.meta,
  });
}

/** Ordered pipeline steps for the visual tracker (excludes cancelled/refused). */
export const TRACK_STEPS: BookingStatus[] = [
  "PROPOSED",
  "AWAITING_PAYMENT",
  "ACCEPTED",
  "HANDED_OVER",
  "IN_TRANSIT",
  "DELIVERED",
];

export function stepIndex(status: BookingStatus) {
  if (status === "CANCELLED" || status === "REFUSED") return -1;
  // Demo without Stripe may skip AWAITING_PAYMENT
  if (status === "ACCEPTED") return TRACK_STEPS.indexOf("ACCEPTED");
  return TRACK_STEPS.indexOf(status);
}
