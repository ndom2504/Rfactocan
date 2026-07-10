import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { notifyUser } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { recordBookingEvent } from "@/lib/tracking";

const REASONS = [
  "DAMAGE",
  "MISSING",
  "DELAY",
  "PAYMENT",
  "BEHAVIOR",
  "CUSTOMS",
  "OTHER",
] as const;

const createSchema = z.object({
  bookingId: z.string().min(1),
  reason: z.enum(REASONS),
  details: z.string().min(10).max(2000),
});

export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const bookingId = searchParams.get("bookingId");

  if (bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { trip: { select: { userId: true } } },
    });
    if (!booking) {
      return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    }
    const isParty =
      session.role === "ADMIN" ||
      booking.senderId === session.id ||
      booking.trip.userId === session.id;
    if (!isParty) {
      return NextResponse.json({ error: "Interdit" }, { status: 403 });
    }

    const disputes = await prisma.dispute.findMany({
      where: { bookingId },
      include: {
        openedBy: { select: { id: true, displayName: true } },
        againstUser: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ disputes });
  }

  if (session.role === "ADMIN") {
    const status = searchParams.get("status");
    const disputes = await prisma.dispute.findMany({
      where: status
        ? { status: status as "OPEN" | "IN_REVIEW" | "RESOLVED" | "CLOSED" }
        : { status: { in: ["OPEN", "IN_REVIEW"] } },
      include: {
        openedBy: { select: { id: true, displayName: true, email: true } },
        againstUser: { select: { id: true, displayName: true, email: true } },
        booking: {
          select: {
            id: true,
            status: true,
            request: { select: { fromCity: true, toCity: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ disputes });
  }

  const disputes = await prisma.dispute.findMany({
    where: {
      OR: [{ openedById: session.id }, { againstUserId: session.id }],
    },
    include: {
      openedBy: { select: { id: true, displayName: true } },
      againstUser: { select: { id: true, displayName: true } },
      booking: {
        select: {
          id: true,
          status: true,
          request: { select: { fromCity: true, toCity: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return NextResponse.json({ disputes });
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = createSchema.parse(await request.json());
    const booking = await prisma.booking.findUnique({
      where: { id: body.bookingId },
      include: {
        trip: { select: { userId: true } },
        request: { select: { fromCity: true, toCity: true } },
        payment: { select: { status: true } },
      },
    });
    if (!booking) {
      return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
    }

    const isSender = booking.senderId === session.id;
    const isTraveler = booking.trip.userId === session.id;
    if (!isSender && !isTraveler) {
      return NextResponse.json({ error: "Interdit" }, { status: 403 });
    }

    const allowedStatuses = [
      "ACCEPTED",
      "HANDED_OVER",
      "IN_TRANSIT",
      "DELIVERED",
      "CANCELLED",
    ];
    if (!allowedStatuses.includes(booking.status)) {
      return NextResponse.json(
        { error: "Un litige ne peut être ouvert qu'après mise en relation active." },
        { status: 400 }
      );
    }

    const openExisting = await prisma.dispute.count({
      where: {
        bookingId: booking.id,
        openedById: session.id,
        status: { in: ["OPEN", "IN_REVIEW"] },
      },
    });
    if (openExisting > 0) {
      return NextResponse.json(
        { error: "Vous avez déjà un litige ouvert sur cette réservation." },
        { status: 409 }
      );
    }

    const againstUserId = isSender ? booking.trip.userId : booking.senderId;

    const dispute = await prisma.$transaction(async (tx) => {
      const created = await tx.dispute.create({
        data: {
          bookingId: booking.id,
          openedById: session.id,
          againstUserId,
          reason: body.reason,
          details: body.details,
        },
        include: {
          openedBy: { select: { id: true, displayName: true } },
          againstUser: { select: { id: true, displayName: true } },
        },
      });
      await recordBookingEvent(tx, {
        bookingId: booking.id,
        type: "DISPUTE",
        label: "Litige ouvert",
        actorId: session.id,
        meta: { disputeId: created.id, reason: body.reason },
      });
      return created;
    });

    const route = `${booking.request.fromCity} → ${booking.request.toCity}`;
    void notifyUser({
      userId: againstUserId,
      type: "dispute_opened",
      title: "Litige ouvert",
      body: `${session.displayName} · ${route}`,
      href: `/bookings/${booking.id}`,
    });

    const admins = await prisma.user.findMany({
      where: { role: "ADMIN", status: "ACTIVE" },
      select: { id: true },
    });
    for (const admin of admins) {
      void notifyUser({
        userId: admin.id,
        type: "dispute_admin",
        title: "Nouveau litige",
        body: `${session.displayName} · ${route} · ${body.reason}`,
        href: "/admin",
      });
    }

    return NextResponse.json({ dispute }, { status: 201 });
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

export async function PATCH(request: Request) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  try {
    const body = z
      .object({
        disputeId: z.string().min(1),
        status: z.enum(["OPEN", "IN_REVIEW", "RESOLVED", "CLOSED"]),
        adminNote: z.string().max(2000).optional().nullable(),
      })
      .parse(await request.json());

    const existing = await prisma.dispute.findUnique({
      where: { id: body.disputeId },
      include: {
        booking: {
          include: {
            request: { select: { fromCity: true, toCity: true } },
          },
        },
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "Litige introuvable" }, { status: 404 });
    }

    const resolved =
      body.status === "RESOLVED" || body.status === "CLOSED"
        ? new Date()
        : null;

    const dispute = await prisma.dispute.update({
      where: { id: body.disputeId },
      data: {
        status: body.status,
        adminNote: body.adminNote ?? existing.adminNote,
        resolvedAt: resolved ?? existing.resolvedAt,
        updatedAt: new Date(),
      },
    });

    const route = `${existing.booking.request.fromCity} → ${existing.booking.request.toCity}`;
    for (const userId of [existing.openedById, existing.againstUserId]) {
      void notifyUser({
        userId,
        type: "dispute_updated",
        title: "Mise à jour du litige",
        body: `${body.status} · ${route}`,
        href: `/bookings/${existing.bookingId}`,
      });
    }

    return NextResponse.json({ dispute });
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
