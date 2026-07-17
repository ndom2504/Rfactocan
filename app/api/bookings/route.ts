import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { travelerCanReceivePayments } from "@/lib/connect";
import {
  emailBookingApplication,
  emailBookingProposed,
} from "@/lib/email";
import { notifyUser } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { isStripeConfigured } from "@/lib/stripe";
import { recordBookingEvent, statusEventLabel } from "@/lib/tracking";

const createSchema = z.object({
  requestId: z.string().min(1),
  tripId: z.string().min(1),
  goodsCertified: z.boolean().optional(),
  customsAcknowledged: z.boolean().optional(),
  /** Sender counter-offer per kg (trip currency). Only if trip.priceNegotiable. */
  offeredPricePerKg: z.coerce.number().positive().max(100000).optional(),
});

export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const as = searchParams.get("as") ?? "all";

  const bookings = await prisma.booking.findMany({
    where: {
      OR: [
        ...(as === "sender" || as === "all" ? [{ senderId: session.id }] : []),
        ...(as === "traveler" || as === "all"
          ? [{ trip: { userId: session.id } }]
          : []),
      ],
    },
    include: {
      request: true,
      payment: true,
      trip: {
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              ratingAvg: true,
              verifiedAt: true,
            },
          },
        },
      },
      sender: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          ratingAvg: true,
          verifiedAt: true,
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ bookings });
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = createSchema.parse(await request.json());
    const parcel = await prisma.parcelRequest.findUnique({
      where: { id: body.requestId },
      include: { user: true },
    });
    const trip = await prisma.trip.findUnique({
      where: { id: body.tripId },
      include: { user: true },
    });

    if (!parcel || !trip) {
      return NextResponse.json({ error: "Ressource introuvable" }, { status: 404 });
    }

    const isSender = parcel.userId === session.id;
    const isTraveler = trip.userId === session.id;

    if (!isSender && !isTraveler) {
      return NextResponse.json(
        {
          error:
            "Seuls l'expéditeur de la demande ou le voyageur du trajet peuvent proposer.",
        },
        { status: 403 }
      );
    }
    if (isSender && isTraveler) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas réserver votre propre voyage." },
        { status: 400 }
      );
    }
    if (trip.status !== "OPEN" || parcel.status !== "OPEN") {
      return NextResponse.json(
        { error: "Voyage ou demande non disponible." },
        { status: 400 }
      );
    }

    const proposedBy = isTraveler ? "TRAVELER" : "SENDER";

    let offeredPricePerKg: number | undefined;
    if (body.offeredPricePerKg != null) {
      if (!trip.priceNegotiable) {
        return NextResponse.json(
          {
            error:
              "Ce voyage n'est pas négociable — le prix affiché est fixe.",
          },
          { status: 400 }
        );
      }
      if (!isSender) {
        return NextResponse.json(
          {
            error: "Seul l'expéditeur peut proposer un prix négocié.",
          },
          { status: 403 }
        );
      }
      offeredPricePerKg = body.offeredPricePerKg;
    }

    if (proposedBy === "TRAVELER") {
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
        if (trip.user.kycStatus !== "VERIFIED") {
          return NextResponse.json(
            {
              error:
                "Vérifiez votre identité (KYC) avant de postuler sur une demande.",
              code: "KYC_REQUIRED",
            },
            { status: 400 }
          );
        }
        if (!travelerCanReceivePayments(trip.user)) {
          return NextResponse.json(
            {
              error:
                "Configurez la réception de vos gains (compte bancaire Stripe) dans Profil avant de postuler.",
              code: "CONNECT_REQUIRED",
            },
            { status: 400 }
          );
        }
      }
    }

    const booking = await prisma.$transaction(async (tx) => {
      const created = await tx.booking.create({
        data: {
          requestId: body.requestId,
          tripId: body.tripId,
          senderId: parcel.userId,
          proposedBy,
          status: "PROPOSED",
          ...(proposedBy === "TRAVELER"
            ? { goodsCertified: true, customsAcknowledged: true }
            : {}),
          ...(offeredPricePerKg != null ? { offeredPricePerKg } : {}),
        },
      });
      await recordBookingEvent(tx, {
        bookingId: created.id,
        type: "STATUS",
        status: "PROPOSED",
        label: statusEventLabel("PROPOSED"),
        actorId: session.id,
        meta: {
          requestId: body.requestId,
          tripId: body.tripId,
          proposedBy,
          ...(offeredPricePerKg != null ? { offeredPricePerKg } : {}),
        },
      });
      return created;
    });

    const route = `${parcel.fromCity} → ${parcel.toCity}`;

    if (proposedBy === "SENDER") {
      void emailBookingProposed({
        travelerEmail: trip.user.email,
        travelerName: trip.user.displayName,
        senderName: session.displayName,
        route,
        bookingId: booking.id,
      });
      void notifyUser({
        userId: trip.userId,
        type: "booking_proposed",
        title: "Nouvelle proposition de colis",
        body: `${session.displayName} · ${route}`,
        href: `/bookings/${booking.id}`,
      });
    } else {
      void emailBookingApplication({
        senderEmail: parcel.user.email,
        senderName: parcel.user.displayName,
        travelerName: session.displayName,
        route,
        bookingId: booking.id,
      });
      void notifyUser({
        userId: parcel.userId,
        type: "booking_application",
        title: "Un voyageur a postulé",
        body: `${session.displayName} · ${route}`,
        href: `/bookings/${booking.id}`,
      });
    }

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Une proposition existe déjà pour ce voyage." },
        { status: 409 }
      );
    }
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
