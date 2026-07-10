import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import {
  generateHandoverCode,
  generateHandoverToken,
  handoverConfirmUrl,
  handoverExpiry,
} from "@/lib/handover";
import { notifyUser } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { recordBookingEvent, statusEventLabel } from "@/lib/tracking";

type Params = { params: Promise<{ id: string }> };

async function loadPartyBooking(id: string, userId: string, isAdmin: boolean) {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      trip: { select: { userId: true } },
      request: { select: { fromCity: true, toCity: true } },
      sender: { select: { displayName: true } },
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
  const booking = await loadPartyBooking(
    id,
    session.id,
    session.role === "ADMIN"
  );
  if (!booking) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const isSender = booking.senderId === session.id;
  const isTraveler = booking.trip.userId === session.id;
  const active =
    booking.status === "ACCEPTED" &&
    booking.handoverToken &&
    booking.handoverExpiresAt &&
    booking.handoverExpiresAt > new Date();

  let qrDataUrl: string | null = null;
  let confirmUrl: string | null = null;
  if (active && booking.handoverToken) {
    confirmUrl = handoverConfirmUrl(booking.handoverToken);
    qrDataUrl = await QRCode.toDataURL(confirmUrl, {
      width: 280,
      margin: 1,
      errorCorrectionLevel: "M",
    });
  }

  return NextResponse.json({
    status: booking.status,
    isSender,
    isTraveler,
    canGenerate: booking.status === "ACCEPTED" && (isSender || isTraveler),
    canConfirmCode:
      booking.status === "ACCEPTED" && (isTraveler || session.role === "ADMIN"),
    handedOverAt: booking.handedOverAt,
    code: active ? booking.handoverCode : null,
    expiresAt: active ? booking.handoverExpiresAt : null,
    confirmUrl,
    qrDataUrl,
  });
}

export async function POST(request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = z
      .object({
        action: z.enum(["generate", "confirm_code"]).default("generate"),
        code: z.string().min(4).max(12).optional(),
      })
      .parse(await request.json().catch(() => ({ action: "generate" })));

    const booking = await loadPartyBooking(
      id,
      session.id,
      session.role === "ADMIN"
    );
    if (!booking) {
      return NextResponse.json({ error: "Interdit" }, { status: 403 });
    }

    const isSender = booking.senderId === session.id;
    const isTraveler = booking.trip.userId === session.id;

    if (body.action === "generate") {
      if (booking.status !== "ACCEPTED") {
        return NextResponse.json(
          { error: "Le QR de remise est disponible après paiement confirmé." },
          { status: 400 }
        );
      }
      if (!isSender && !isTraveler && session.role !== "ADMIN") {
        return NextResponse.json({ error: "Interdit" }, { status: 403 });
      }

      const token = generateHandoverToken();
      const code = generateHandoverCode(6);
      const expiresAt = handoverExpiry(48);
      const updated = await prisma.booking.update({
        where: { id },
        data: {
          handoverToken: token,
          handoverCode: code,
          handoverExpiresAt: expiresAt,
        },
      });

      await recordBookingEvent(prisma, {
        bookingId: id,
        type: "HANDOVER_QR",
        label: "QR de remise généré",
        actorId: session.id,
        meta: { expiresAt: expiresAt.toISOString() },
      });

      const confirmUrl = handoverConfirmUrl(token);
      const qrDataUrl = await QRCode.toDataURL(confirmUrl, {
        width: 280,
        margin: 1,
        errorCorrectionLevel: "M",
      });

      const otherId = isSender ? booking.trip.userId : booking.senderId;
      const route = `${booking.request.fromCity} → ${booking.request.toCity}`;
      void notifyUser({
        userId: otherId,
        type: "handover_qr",
        title: "QR de remise prêt",
        body: `${session.displayName} · ${route}`,
        href: `/bookings/${id}`,
      });

      return NextResponse.json({
        code: updated.handoverCode,
        expiresAt: updated.handoverExpiresAt,
        confirmUrl,
        qrDataUrl,
      });
    }

    // confirm_code — traveler enters the code shown by sender
    if (booking.status !== "ACCEPTED") {
      return NextResponse.json(
        { error: "Cette réservation n'attend plus une remise." },
        { status: 400 }
      );
    }
    if (!isTraveler && session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Seul le voyageur confirme la remise via le code." },
        { status: 403 }
      );
    }
    const entered = (body.code ?? "").trim().toUpperCase();
    if (
      !booking.handoverCode ||
      !booking.handoverExpiresAt ||
      booking.handoverExpiresAt < new Date() ||
      entered !== booking.handoverCode.toUpperCase()
    ) {
      return NextResponse.json(
        { error: "Code invalide ou expiré." },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.booking.update({
        where: { id },
        data: {
          status: "HANDED_OVER",
          handedOverAt: new Date(),
          handoverToken: null,
          handoverCode: null,
          handoverExpiresAt: null,
        },
      });
      await recordBookingEvent(tx, {
        bookingId: id,
        type: "STATUS",
        status: "HANDED_OVER",
        label: statusEventLabel("HANDED_OVER"),
        actorId: session.id,
        meta: { via: "qr_code" },
      });
      return result;
    });

    const route = `${booking.request.fromCity} → ${booking.request.toCity}`;
    void notifyUser({
      userId: booking.senderId,
      type: "handed_over",
      title: "Colis remis",
      body: `${session.displayName} a confirmé la remise · ${route}`,
      href: `/bookings/${id}`,
    });

    return NextResponse.json({ booking: updated });
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
