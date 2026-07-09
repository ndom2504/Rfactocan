import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { notifyUser } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { TRACK_STEPS, stepIndex } from "@/lib/tracking";
import type { BookingStatus } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyM: z.number().positive().max(50000).optional().nullable(),
  label: z.string().max(120).optional().nullable(),
});

async function assertParty(bookingId: string, userId: string, isAdmin: boolean) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      trip: { select: { userId: true } },
      request: { select: { fromCity: true, toCity: true } },
      sender: { select: { id: true, displayName: true } },
    },
  });
  if (!booking) return null;
  const ok =
    isAdmin ||
    booking.senderId === userId ||
    booking.trip.userId === userId;
  return ok ? booking : null;
}

export async function GET(_request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const { id } = await params;
  const booking = await assertParty(id, session.id, session.role === "ADMIN");
  if (!booking) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const [events, locations] = await Promise.all([
    prisma.bookingEvent.findMany({
      where: { bookingId: id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.bookingLocation.findMany({
      where: { bookingId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const latestLocation = locations[0] ?? null;
  const current = booking.status as BookingStatus;

  return NextResponse.json({
    status: current,
    stepIndex: stepIndex(current),
    steps: TRACK_STEPS,
    events: events.map((e) => ({
      ...e,
      meta: JSON.parse(e.metaJson || "{}") as Record<string, unknown>,
    })),
    locations: locations.map((l) => ({
      id: l.id,
      latitude: l.latitude,
      longitude: l.longitude,
      accuracyM: l.accuracyM,
      label: l.label,
      userId: l.userId,
      createdAt: l.createdAt,
      mapsUrl: `https://www.google.com/maps?q=${l.latitude},${l.longitude}`,
    })),
    latestLocation: latestLocation
      ? {
          ...latestLocation,
          mapsUrl: `https://www.google.com/maps?q=${latestLocation.latitude},${latestLocation.longitude}`,
        }
      : null,
    canShareLocation:
      booking.trip.userId === session.id &&
      ["ACCEPTED", "HANDED_OVER", "IN_TRANSIT"].includes(booking.status),
  });
}

export async function POST(request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const booking = await assertParty(id, session.id, session.role === "ADMIN");
    if (!booking) {
      return NextResponse.json({ error: "Interdit" }, { status: 403 });
    }

    const isTraveler = booking.trip.userId === session.id;
    if (!isTraveler && session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Seul le voyageur peut partager sa position." },
        { status: 403 }
      );
    }

    if (!["ACCEPTED", "HANDED_OVER", "IN_TRANSIT"].includes(booking.status)) {
      return NextResponse.json(
        {
          error:
            "Le partage GPS est disponible après paiement, pendant le transit.",
        },
        { status: 400 }
      );
    }

    const body = locationSchema.parse(await request.json());
    const location = await prisma.$transaction(async (tx) => {
      const loc = await tx.bookingLocation.create({
        data: {
          bookingId: id,
          userId: session.id,
          latitude: body.latitude,
          longitude: body.longitude,
          accuracyM: body.accuracyM ?? null,
          label: body.label ?? null,
        },
      });
      await tx.bookingEvent.create({
        data: {
          bookingId: id,
          type: "LOCATION",
          label: "Position partagée",
          actorId: session.id,
          metaJson: JSON.stringify({
            latitude: body.latitude,
            longitude: body.longitude,
            accuracyM: body.accuracyM ?? null,
          }),
        },
      });
      await tx.booking.update({
        where: { id },
        data: { updatedAt: new Date() },
      });
      return loc;
    });

    const route = `${booking.request.fromCity} → ${booking.request.toCity}`;
    void notifyUser({
      userId: booking.senderId,
      type: "location_shared",
      title: "Position mise à jour",
      body: `${session.displayName} · ${route}`,
      href: `/bookings/${id}`,
    });

    return NextResponse.json(
      {
        location: {
          ...location,
          mapsUrl: `https://www.google.com/maps?q=${location.latitude},${location.longitude}`,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message },
        { status: 400 }
      );
    }
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
