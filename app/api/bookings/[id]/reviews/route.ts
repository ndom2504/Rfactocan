import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
  toUserId: z.string().min(1),
});

export async function POST(request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = schema.parse(await request.json());
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { trip: true, reviews: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
    }
    if (booking.status !== "DELIVERED") {
      return NextResponse.json(
        { error: "La notation est possible uniquement après livraison." },
        { status: 400 }
      );
    }

    const isSender = booking.senderId === session.id;
    const isTraveler = booking.trip.userId === session.id;
    if (!isSender && !isTraveler) {
      return NextResponse.json({ error: "Interdit" }, { status: 403 });
    }

    const expectedTarget = isSender ? booking.trip.userId : booking.senderId;
    if (body.toUserId !== expectedTarget) {
      return NextResponse.json({ error: "Destinataire invalide." }, { status: 400 });
    }

    if (booking.reviews.some((r) => r.fromUserId === session.id)) {
      return NextResponse.json(
        { error: "Vous avez déjà noté cette livraison." },
        { status: 409 }
      );
    }

    const review = await prisma.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: {
          bookingId: id,
          fromUserId: session.id,
          toUserId: body.toUserId,
          rating: body.rating,
          comment: body.comment,
        },
      });

      const agg = await tx.review.aggregate({
        where: { toUserId: body.toUserId },
        _avg: { rating: true },
        _count: { rating: true },
      });

      await tx.user.update({
        where: { id: body.toUserId },
        data: {
          ratingAvg: agg._avg.rating ?? 0,
          ratingCount: agg._count.rating,
        },
      });

      return created;
    });

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
