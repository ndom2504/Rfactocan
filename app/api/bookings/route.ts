import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { emailBookingProposed } from "@/lib/email";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  requestId: z.string().min(1),
  tripId: z.string().min(1),
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
    });
    const trip = await prisma.trip.findUnique({
      where: { id: body.tripId },
      include: { user: true },
    });

    if (!parcel || !trip) {
      return NextResponse.json({ error: "Ressource introuvable" }, { status: 404 });
    }
    if (parcel.userId !== session.id) {
      return NextResponse.json(
        { error: "Seule l'expéditeur peut proposer une réservation." },
        { status: 403 }
      );
    }
    if (trip.userId === session.id) {
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

    const booking = await prisma.booking.create({
      data: {
        requestId: body.requestId,
        tripId: body.tripId,
        senderId: session.id,
        status: "PROPOSED",
      },
    });

    const route = `${parcel.fromCity} → ${parcel.toCity}`;
    void emailBookingProposed({
      travelerEmail: trip.user.email,
      travelerName: trip.user.displayName,
      senderName: session.displayName,
      route,
      bookingId: booking.id,
    });

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
