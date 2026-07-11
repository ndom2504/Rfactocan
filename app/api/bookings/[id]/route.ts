import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { travelerCanReceivePayments } from "@/lib/connect";
import { emailDelivered, emailPaymentRequested } from "@/lib/email";
import { notifyUser } from "@/lib/notifications";
import { getPaymentProvider, quotePaymentAmount } from "@/lib/payments/provider";
import {
  ensurePaymentNotExpired,
  paymentDeadlineFrom,
} from "@/lib/payments/expiry";
import { effectivePricePerKg } from "@/lib/negotiation";
import { formatMoneyFromCents } from "@/lib/currency";
import { prisma } from "@/lib/prisma";
import { isStripeConfigured } from "@/lib/stripe";
import { recordBookingEvent, statusEventLabel } from "@/lib/tracking";
import type { BookingStatus } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z
  .object({
    status: z
      .enum([
        "AWAITING_PAYMENT",
        "ACCEPTED",
        "REFUSED",
        "HANDED_OVER",
        "IN_TRANSIT",
        "DELIVERED",
        "CANCELLED",
      ])
      .optional(),
    goodsCertified: z.boolean().optional(),
    customsAcknowledged: z.boolean().optional(),
    offeredPricePerKg: z.coerce.number().positive().max(500).optional(),
  })
  .refine(
    (data) => data.status !== undefined || data.offeredPricePerKg !== undefined,
    { message: "Aucune modification fournie" }
  );

const transitions: Record<BookingStatus, BookingStatus[]> = {
  PROPOSED: ["AWAITING_PAYMENT", "ACCEPTED", "REFUSED", "CANCELLED"],
  AWAITING_PAYMENT: ["ACCEPTED", "CANCELLED", "REFUSED"],
  ACCEPTED: ["HANDED_OVER", "CANCELLED"],
  HANDED_OVER: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
  REFUSED: [],
};

export async function GET(_request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  await ensurePaymentNotExpired(id);

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      request: true,
      payment: true,
      trip: {
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              ratingAvg: true,
              ratingCount: true,
              verifiedAt: true,
              avatarUrl: true,
              kycStatus: true,
              stripeConnectChargesEnabled: true,
              stripeConnectPayoutsEnabled: true,
              stripeConnectAccountId: true,
            },
          },
        },
      },
      sender: {
        select: {
          id: true,
          displayName: true,
          ratingAvg: true,
          ratingCount: true,
          verifiedAt: true,
          avatarUrl: true,
          kycStatus: true,
          preferredCurrency: true,
        },
      },
      reviews: true,
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  }

  const isParty =
    booking.senderId === session.id ||
    booking.trip.userId === session.id ||
    session.role === "ADMIN";
  if (!isParty) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const corridor = await prisma.corridorConfig.findUnique({
    where: {
      fromCountry_toCountry: {
        fromCountry: booking.request.fromCountry,
        toCountry: booking.request.toCountry,
      },
    },
  });

  // Payer currency = logged-in sender's profile preference (auto FX from trip).
  const payerPreferred =
    session.id === booking.senderId
      ? session.preferredCurrency
      : booking.sender.preferredCurrency;

  const quote = quotePaymentAmount({
    weightKg: booking.request.weightKg,
    pricePerKg: effectivePricePerKg(booking),
    tripCurrency: booking.trip.currency,
    preferredCurrency: payerPreferred,
    fromCountry: booking.request.fromCountry,
    toCountry: booking.request.toCountry,
    corridorCurrency: corridor?.currency,
  });

  // Only lock to stored Payment once funds are authorized/captured.
  // REQUIRES_PAYMENT rows may still hold a stale corridor currency (e.g. EUR).
  const paymentLocked =
    booking.payment != null &&
    ["AUTHORIZED", "CAPTURED", "REFUNDED"].includes(booking.payment.status);

  return NextResponse.json({
    booking: {
      ...booking,
      request: {
        ...booking.request,
        photos: JSON.parse(booking.request.photosJson || "[]") as string[],
      },
    },
    paymentQuote: paymentLocked
      ? {
          amountCents: booking.payment!.amountCadCents,
          currency: booking.payment!.currency.toUpperCase(),
          sourceCurrency: quote.sourceCurrency,
          sourceMajor: quote.sourceMajor,
          payerMajor: booking.payment!.amountCadCents,
        }
      : {
          amountCents: quote.amountCents,
          currency: quote.currency,
          sourceCurrency: quote.sourceCurrency,
          sourceMajor: quote.sourceMajor,
          payerMajor: quote.payerMajor,
        },
    stripeConfigured: isStripeConfigured(),
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = patchSchema.parse(await request.json());
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        trip: { include: { user: true } },
        request: true,
        payment: true,
        sender: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
    }

    const isTraveler = booking.trip.userId === session.id;
    const isSender = booking.senderId === session.id;

    // Sender counter-offer on a negotiable trip (no status change required).
    if (body.offeredPricePerKg !== undefined && body.status === undefined) {
      if (!isSender) {
        return NextResponse.json(
          { error: "Seul l'expéditeur peut proposer un prix." },
          { status: 403 }
        );
      }
      if (!booking.trip.priceNegotiable) {
        return NextResponse.json(
          { error: "Ce voyage n'est pas négociable." },
          { status: 400 }
        );
      }
      if (!["PROPOSED", "AWAITING_PAYMENT"].includes(booking.status)) {
        return NextResponse.json(
          {
            error:
              "Le prix ne peut plus être négocié à ce stade de la réservation.",
          },
          { status: 400 }
        );
      }
      const updatedOffer = await prisma.booking.update({
        where: { id },
        data: { offeredPricePerKg: body.offeredPricePerKg },
        include: {
          trip: { include: { user: true } },
          request: true,
          payment: true,
          sender: true,
        },
      });
      void notifyUser({
        userId: booking.trip.userId,
        type: "price_offer",
        title: "Nouvelle offre de prix",
        body: `${booking.sender.displayName} propose ${body.offeredPricePerKg} ${booking.trip.currency || "CAD"}/kg`,
        href: `/bookings/${booking.id}`,
      });
      return NextResponse.json({ booking: updatedOffer });
    }

    if (body.status === undefined) {
      return NextResponse.json(
        { error: "Statut requis" },
        { status: 400 }
      );
    }

    const allowed = transitions[booking.status] ?? [];

    // Traveler "accept" → AWAITING_PAYMENT (Stripe) or ACCEPTED (demo sans Stripe)
    let nextStatus: BookingStatus;
    if (booking.status === "PROPOSED" && body.status === "ACCEPTED") {
      nextStatus = isStripeConfigured() ? "AWAITING_PAYMENT" : "ACCEPTED";
    } else {
      nextStatus = body.status as BookingStatus;
    }

    if (!allowed.includes(nextStatus)) {
      return NextResponse.json(
        { error: `Transition invalide depuis ${booking.status}` },
        { status: 400 }
      );
    }

    const proposedByTraveler = booking.proposedBy === "TRAVELER";
    // Sender proposes → traveler accepts/refuses.
    // Traveler applies → sender accepts/refuses.
    const canDecideProposal = proposedByTraveler ? isSender : isTraveler;

    if (
      body.status === "REFUSED" ||
      (booking.status === "PROPOSED" && body.status === "ACCEPTED")
    ) {
      if (!canDecideProposal) {
        return NextResponse.json(
          {
            error: proposedByTraveler
              ? "Seul l'expéditeur peut accepter ou refuser cette candidature."
              : "Seul le voyageur peut accepter ou refuser.",
          },
          { status: 403 }
        );
      }
    }

    if (
      booking.status === "PROPOSED" &&
      body.status === "ACCEPTED" &&
      !proposedByTraveler &&
      isTraveler
    ) {
      if (!body.goodsCertified || !body.customsAcknowledged) {
        return NextResponse.json(
          {
            error:
              "Vous devez certifier l'inspection du colis et la conformité douanière.",
          },
          { status: 400 }
        );
      }

      if (isStripeConfigured()) {
        const traveler = booking.trip.user;
        if (traveler.kycStatus !== "VERIFIED") {
          return NextResponse.json(
            {
              error:
                "Vérifiez votre identité (KYC) avant d'accepter une réservation.",
              code: "KYC_REQUIRED",
            },
            { status: 400 }
          );
        }
        if (!travelerCanReceivePayments(traveler)) {
          return NextResponse.json(
            {
              error:
                "Configurez la réception de vos gains (compte bancaire Stripe) dans Profil avant d'accepter.",
              code: "CONNECT_REQUIRED",
            },
            { status: 400 }
          );
        }
      }
    }

    // ACCEPTED only via payment webhook (or admin) — block manual jump
    if (
      body.status === "ACCEPTED" &&
      booking.status === "AWAITING_PAYMENT" &&
      session.role !== "ADMIN"
    ) {
      return NextResponse.json(
        {
          error:
            "Le statut Accepté est activé automatiquement après le paiement sécurisé.",
        },
        { status: 400 }
      );
    }

    if (nextStatus === "CANCELLED" && !isSender && !isTraveler && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Interdit" }, { status: 403 });
    }

    if (
      ["HANDED_OVER", "IN_TRANSIT", "DELIVERED"].includes(nextStatus) &&
      !isSender &&
      !isTraveler
    ) {
      return NextResponse.json({ error: "Interdit" }, { status: 403 });
    }

    if (
      ["HANDED_OVER", "IN_TRANSIT", "DELIVERED"].includes(nextStatus) &&
      booking.status !== "ACCEPTED" &&
      !["HANDED_OVER", "IN_TRANSIT"].includes(booking.status)
    ) {
      if (booking.status === "AWAITING_PAYMENT") {
        return NextResponse.json(
          { error: "Le paiement doit être confirmé avant le transit." },
          { status: 400 }
        );
      }
    }

    if (nextStatus === "DELIVERED") {
      if (isStripeConfigured() && booking.payment?.status === "AUTHORIZED") {
        try {
          await getPaymentProvider().captureAndTransfer(booking.id);
        } catch (error) {
          console.error(error);
          return NextResponse.json(
            {
              error:
                "Livraison enregistrée impossible : échec de la capture/transfert Stripe.",
            },
            { status: 502 }
          );
        }
      } else if (
        isStripeConfigured() &&
        booking.payment &&
        booking.payment.status !== "CAPTURED"
      ) {
        return NextResponse.json(
          { error: "Le paiement n'est pas encore autorisé." },
          { status: 400 }
        );
      }
    }

    if (
      (nextStatus === "CANCELLED" || nextStatus === "REFUSED") &&
      isStripeConfigured()
    ) {
      try {
        await getPaymentProvider().cancelAuthorization(booking.id);
      } catch (error) {
        console.error(error);
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.booking.update({
        where: { id },
        data: {
          status: nextStatus,
          ...(nextStatus === "AWAITING_PAYMENT"
            ? {
                goodsCertified: true,
                customsAcknowledged: true,
                paymentExpiresAt: paymentDeadlineFrom(),
              }
            : {}),
          ...(nextStatus === "ACCEPTED" && booking.status === "PROPOSED"
            ? {
                goodsCertified: true,
                customsAcknowledged: true,
              }
            : {}),
          ...(nextStatus === "CANCELLED" || nextStatus === "REFUSED"
            ? {
                cancelledReason:
                  nextStatus === "REFUSED" ? "REFUSED" : "USER_CANCELLED",
                cancelledById: session.id,
              }
            : {}),
        },
      });

      if (nextStatus !== booking.status) {
        await recordBookingEvent(tx, {
          bookingId: id,
          type: "STATUS",
          status: nextStatus,
          label: statusEventLabel(nextStatus),
          actorId: session.id,
          meta: { from: booking.status, to: nextStatus },
        });
      }

      // Request stays OPEN until Stripe payment succeeds (first-pay-wins).
      // Only lock MATCHED when accepting without Stripe (demo mode).
      if (nextStatus === "ACCEPTED" && booking.status === "PROPOSED") {
        await tx.parcelRequest.update({
          where: { id: booking.requestId },
          data: { status: "MATCHED" },
        });
      }

      if (nextStatus === "DELIVERED") {
        await tx.parcelRequest.update({
          where: { id: booking.requestId },
          data: { status: "CLOSED" },
        });
        await tx.user.update({
          where: { id: booking.trip.userId },
          data: { completedDeliveries: { increment: 1 } },
        });
      }

      return result;
    });

    const route = `${booking.request.fromCity} → ${booking.request.toCity}`;

    if (nextStatus === "AWAITING_PAYMENT") {
      const corridor = await prisma.corridorConfig.findUnique({
        where: {
          fromCountry_toCountry: {
            fromCountry: booking.request.fromCountry,
            toCountry: booking.request.toCountry,
          },
        },
      });
      const payQuote = quotePaymentAmount({
        weightKg: booking.request.weightKg,
        pricePerKg: effectivePricePerKg({
          offeredPricePerKg:
            body.offeredPricePerKg ?? booking.offeredPricePerKg,
          trip: booking.trip,
        }),
        tripCurrency: booking.trip.currency,
        preferredCurrency: booking.sender.preferredCurrency,
        fromCountry: booking.request.fromCountry,
        toCountry: booking.request.toCountry,
        corridorCurrency: corridor?.currency,
      });
      const amountLabel = formatMoneyFromCents(
        payQuote.amountCents,
        payQuote.currency
      );
      const paymentBody = proposedByTraveler
        ? `Candidature acceptée · ${route} · ${amountLabel}`
        : `${booking.trip.user.displayName} a accepté · ${route} · ${amountLabel}`;
      void emailPaymentRequested({
        senderEmail: booking.sender.email,
        senderName: booking.sender.displayName,
        travelerName: booking.trip.user.displayName,
        route,
        bookingId: booking.id,
        acceptedBySender: proposedByTraveler,
        amountLabel,
      });
      void notifyUser({
        userId: booking.senderId,
        type: "payment_requested",
        title: "Paiement requis",
        body: paymentBody,
        href: `/bookings/${booking.id}`,
      });
      if (proposedByTraveler) {
        void notifyUser({
          userId: booking.trip.userId,
          type: "booking_accepted",
          title: "Candidature acceptée",
          body: `${booking.sender.displayName} · ${route}`,
          href: `/bookings/${booking.id}`,
        });
      }
    } else if (
      nextStatus === "ACCEPTED" &&
      booking.status === "PROPOSED" &&
      proposedByTraveler
    ) {
      void notifyUser({
        userId: booking.trip.userId,
        type: "booking_accepted",
        title: "Candidature acceptée",
        body: `${booking.sender.displayName} · ${route}`,
        href: `/bookings/${booking.id}`,
      });
    }

    if (nextStatus === "DELIVERED") {
      const payoutCents =
        booking.payment?.travelerPayoutCents ??
        (await prisma.payment.findUnique({ where: { bookingId: booking.id } }))
          ?.travelerPayoutCents ??
        0;
      const payoutLabel = formatMoneyFromCents(
        payoutCents,
        booking.payment?.currency ?? "CAD"
      );
      void emailDelivered({
        senderEmail: booking.sender.email,
        travelerEmail: booking.trip.user.email,
        senderName: booking.sender.displayName,
        travelerName: booking.trip.user.displayName,
        route,
        bookingId: booking.id,
        payoutLabel,
      });
      void notifyUser({
        userId: booking.senderId,
        type: "delivered",
        title: "Colis livré",
        body: route,
        href: `/bookings/${booking.id}`,
      });
      void notifyUser({
        userId: booking.trip.userId,
        type: "payout_released",
        title: "Fonds libérés",
        body: `${payoutLabel} · ${route}`,
        href: `/bookings/${booking.id}`,
      });
    }

    return NextResponse.json({ booking: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
