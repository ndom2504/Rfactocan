import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { notifyUser } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { recordBookingEvent, statusEventLabel } from "@/lib/tracking";

type Params = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const { token } = await params;
  const booking = await prisma.booking.findFirst({
    where: { handoverToken: token },
    include: {
      trip: {
        include: {
          user: { select: { id: true, displayName: true } },
        },
      },
      sender: { select: { id: true, displayName: true } },
      request: {
        select: { fromCity: true, toCity: true, weightKg: true },
      },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "QR introuvable" }, { status: 404 });
  }

  const expired =
    !booking.handoverExpiresAt || booking.handoverExpiresAt < new Date();
  const isTraveler =
    booking.trip.userId === session.id || session.role === "ADMIN";
  const isParty =
    isTraveler ||
    booking.senderId === session.id ||
    session.role === "ADMIN";

  if (!isParty) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  return NextResponse.json({
    booking: {
      id: booking.id,
      status: booking.status,
      fromCity: booking.request.fromCity,
      toCity: booking.request.toCity,
      weightKg: booking.request.weightKg,
      senderName: booking.sender.displayName,
      travelerName: booking.trip.user.displayName,
      expiresAt: booking.handoverExpiresAt,
      code: booking.handoverCode,
    },
    expired,
    canConfirm: isTraveler && booking.status === "ACCEPTED" && !expired,
    alreadyDone: booking.status !== "ACCEPTED" || Boolean(booking.handedOverAt),
  });
}

export async function POST(_request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const { token } = await params;
  const booking = await prisma.booking.findFirst({
    where: { handoverToken: token },
    include: {
      trip: { select: { userId: true } },
      request: { select: { fromCity: true, toCity: true } },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "QR introuvable" }, { status: 404 });
  }
  if (
    booking.trip.userId !== session.id &&
    session.role !== "ADMIN"
  ) {
    return NextResponse.json(
      { error: "Seul le voyageur peut confirmer la remise via ce QR." },
      { status: 403 }
    );
  }
  if (booking.status !== "ACCEPTED") {
    return NextResponse.json(
      { error: "Cette remise a déjà été traitée." },
      { status: 400 }
    );
  }
  if (
    !booking.handoverExpiresAt ||
    booking.handoverExpiresAt < new Date()
  ) {
    return NextResponse.json({ error: "Ce QR a expiré." }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: "HANDED_OVER",
        handedOverAt: new Date(),
        handoverToken: null,
        handoverCode: null,
        handoverExpiresAt: null,
      },
    });
    await recordBookingEvent(tx, {
      bookingId: booking.id,
      type: "STATUS",
      status: "HANDED_OVER",
      label: statusEventLabel("HANDED_OVER"),
      actorId: session.id,
      meta: { via: "qr_scan" },
    });
    return result;
  });

  const route = `${booking.request.fromCity} → ${booking.request.toCity}`;
  void notifyUser({
    userId: booking.senderId,
    type: "handed_over",
    title: "Colis remis",
    body: `${session.displayName} a scanné le QR · ${route}`,
    href: `/bookings/${booking.id}`,
  });

  return NextResponse.json({ booking: updated });
}
