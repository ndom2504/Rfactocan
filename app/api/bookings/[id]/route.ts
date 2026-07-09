import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { BookingStatus } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  status: z.enum([
    "ACCEPTED",
    "REFUSED",
    "HANDED_OVER",
    "IN_TRANSIT",
    "DELIVERED",
    "CANCELLED",
  ]),
  goodsCertified: z.boolean().optional(),
  customsAcknowledged: z.boolean().optional(),
});

const transitions: Record<BookingStatus, BookingStatus[]> = {
  PROPOSED: ["ACCEPTED", "REFUSED", "CANCELLED"],
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
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      request: true,
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

  return NextResponse.json({
    booking: {
      ...booking,
      request: {
        ...booking.request,
        photos: JSON.parse(booking.request.photosJson || "[]") as string[],
      },
    },
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
      include: { trip: true, request: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
    }

    const isTraveler = booking.trip.userId === session.id;
    const isSender = booking.senderId === session.id;
    const allowed = transitions[booking.status] ?? [];
    if (!allowed.includes(body.status as BookingStatus)) {
      return NextResponse.json(
        { error: `Transition invalide depuis ${booking.status}` },
        { status: 400 }
      );
    }

    if (body.status === "ACCEPTED" || body.status === "REFUSED") {
      if (!isTraveler) {
        return NextResponse.json(
          { error: "Seul le voyageur peut accepter ou refuser." },
          { status: 403 }
        );
      }
      if (body.status === "ACCEPTED") {
        if (!body.goodsCertified || !body.customsAcknowledged) {
          return NextResponse.json(
            {
              error:
                "Vous devez certifier l'inspection du colis et la conformité douanière.",
            },
            { status: 400 }
          );
        }
      }
    }

    if (body.status === "CANCELLED" && !isSender && !isTraveler) {
      return NextResponse.json({ error: "Interdit" }, { status: 403 });
    }

    if (
      ["HANDED_OVER", "IN_TRANSIT", "DELIVERED"].includes(body.status) &&
      !isSender &&
      !isTraveler
    ) {
      return NextResponse.json({ error: "Interdit" }, { status: 403 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.booking.update({
        where: { id },
        data: {
          status: body.status as BookingStatus,
          ...(body.status === "ACCEPTED"
            ? {
                goodsCertified: true,
                customsAcknowledged: true,
              }
            : {}),
        },
      });

      if (body.status === "ACCEPTED") {
        await tx.parcelRequest.update({
          where: { id: booking.requestId },
          data: { status: "MATCHED" },
        });
      }

      if (body.status === "DELIVERED") {
        await tx.parcelRequest.update({
          where: { id: booking.requestId },
          data: { status: "CLOSED" },
        });
      }

      return result;
    });

    return NextResponse.json({ booking: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
