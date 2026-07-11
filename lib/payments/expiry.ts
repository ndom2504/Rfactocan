import { getPaymentProvider } from "@/lib/payments/provider";
import { notifyUser } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { isStripeConfigured } from "@/lib/stripe";
import { recordBookingEvent, statusEventLabel } from "@/lib/tracking";

export const PAYMENT_WINDOW_MS = 24 * 60 * 60 * 1000;

export type CancelReason =
  | "PAYMENT_TIMEOUT"
  | "ADMIN_CHARTER"
  | "SUPERSEDED_BY_PAYMENT"
  | "USER_CANCELLED"
  | "REFUSED";

export function paymentDeadlineFrom(now = new Date()) {
  return new Date(now.getTime() + PAYMENT_WINDOW_MS);
}

export function isPaymentExpired(booking: {
  status: string;
  paymentExpiresAt?: Date | string | null;
}) {
  if (booking.status !== "AWAITING_PAYMENT") return false;
  if (!booking.paymentExpiresAt) return false;
  return new Date(booking.paymentExpiresAt).getTime() <= Date.now();
}

export async function setPaymentDeadline(bookingId: string) {
  const paymentExpiresAt = paymentDeadlineFrom();
  return prisma.booking.update({
    where: { id: bookingId },
    data: { paymentExpiresAt },
  });
}

/**
 * Cancel a pending booking/payment. Does not close the parcel request
 * (offer stays available until someone successfully pays).
 */
export async function expireBookingPayment(
  bookingId: string,
  reason: CancelReason,
  cancelledById?: string | null
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      request: true,
      payment: true,
      trip: { select: { userId: true } },
    },
  });
  if (!booking) return null;
  if (!["PROPOSED", "AWAITING_PAYMENT"].includes(booking.status)) {
    return booking;
  }

  if (isStripeConfigured() && booking.payment) {
    try {
      await getPaymentProvider().cancelAuthorization(bookingId);
    } catch (error) {
      console.error("cancelAuthorization", error);
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "CANCELLED",
        cancelledReason: reason,
        cancelledById: cancelledById ?? null,
      },
    });

    if (booking.payment && booking.payment.status === "REQUIRES_PAYMENT") {
      await tx.payment.update({
        where: { id: booking.payment.id },
        data: { status: "CANCELLED" },
      });
    }

    await recordBookingEvent(tx, {
      bookingId,
      type: "STATUS",
      status: "CANCELLED",
      label: statusEventLabel("CANCELLED"),
      actorId: cancelledById ?? undefined,
      meta: { reason },
    });

    return result;
  });

  const route = `${booking.request.fromCity} → ${booking.request.toCity}`;
  const reasonLabel =
    reason === "PAYMENT_TIMEOUT"
      ? "Délai de paiement de 24h dépassé"
      : reason === "ADMIN_CHARTER"
        ? "Annulé par l'admin (charte)"
        : reason === "SUPERSEDED_BY_PAYMENT"
          ? "Une autre offre a été payée en premier"
          : "Offre annulée";

  void notifyUser({
    userId: booking.senderId,
    type: "booking_cancelled",
    title: "Offre annulée",
    body: `${reasonLabel} · ${route}`,
    href: `/bookings/${bookingId}`,
  });
  void notifyUser({
    userId: booking.trip.userId,
    type: "booking_cancelled",
    title: "Offre annulée",
    body: `${reasonLabel} · ${route}`,
    href: `/bookings/${bookingId}`,
  });

  return updated;
}

/**
 * First successful payment wins: mark request MATCHED and cancel rival offers.
 */
export async function markRequestMatchedOnPayment(
  requestId: string,
  winningBookingId: string
) {
  const rivals = await prisma.booking.findMany({
    where: {
      requestId,
      id: { not: winningBookingId },
      status: { in: ["PROPOSED", "AWAITING_PAYMENT"] },
    },
    select: { id: true },
  });

  await prisma.parcelRequest.update({
    where: { id: requestId },
    data: { status: "MATCHED" },
  });

  for (const rival of rivals) {
    await expireBookingPayment(rival.id, "SUPERSEDED_BY_PAYMENT");
  }
}

/** Expire all AWAITING_PAYMENT past their deadline. Returns count. */
export async function releaseExpiredPayments() {
  const now = new Date();
  const expired = await prisma.booking.findMany({
    where: {
      status: "AWAITING_PAYMENT",
      paymentExpiresAt: { lte: now },
    },
    select: { id: true },
    take: 100,
  });

  let count = 0;
  for (const b of expired) {
    await expireBookingPayment(b.id, "PAYMENT_TIMEOUT");
    count += 1;
  }
  return count;
}

/** If booking is past deadline, expire it and return the refreshed booking. */
export async function ensurePaymentNotExpired(bookingId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return null;
  if (isPaymentExpired(booking)) {
    await expireBookingPayment(bookingId, "PAYMENT_TIMEOUT");
    return prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true, request: true },
    });
  }
  return booking;
}
