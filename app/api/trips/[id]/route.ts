import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  fromCountry: z.string().min(2).optional(),
  fromCity: z.string().min(2).optional(),
  toCountry: z.string().min(2).optional(),
  toCity: z.string().min(2).optional(),
  departAt: z.string().datetime().or(z.string().min(8)).optional(),
  weightKg: z.coerce.number().positive().max(100).optional(),
  pricePerKgCad: z.coerce.number().positive().max(500).optional(),
  currency: z.enum(["CAD", "USD", "EUR", "XOF", "XAF"]).optional(),
  acceptedGoods: z.string().min(2).optional(),
  notes: z.string().optional().nullable(),
  airline: z.string().optional().nullable(),
  flightNumber: z.string().optional().nullable(),
  fromAirportCode: z.string().optional().nullable(),
  toAirportCode: z.string().optional().nullable(),
  status: z.enum(["OPEN", "FULL", "COMPLETED", "CANCELLED"]).optional(),
});

const ACTIVE_BOOKING = [
  "PROPOSED",
  "AWAITING_PAYMENT",
  "ACCEPTED",
  "HANDED_OVER",
  "IN_TRANSIT",
] as const;

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          ratingAvg: true,
          ratingCount: true,
          verifiedAt: true,
          avatarUrl: true,
          bio: true,
          kycStatus: true,
        },
      },
    },
  });
  if (!trip) {
    return NextResponse.json({ error: "Voyage introuvable" }, { status: 404 });
  }
  return NextResponse.json({ trip });
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const trip = await prisma.trip.findUnique({ where: { id } });
    if (!trip) {
      return NextResponse.json({ error: "Voyage introuvable" }, { status: 404 });
    }
    if (trip.userId !== session.id && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Interdit" }, { status: 403 });
    }
    if (trip.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Ce voyage est déjà annulé." },
        { status: 400 }
      );
    }

    const body = patchSchema.parse(await request.json());
    const updated = await prisma.trip.update({
      where: { id },
      data: {
        ...(body.fromCountry !== undefined
          ? { fromCountry: body.fromCountry }
          : {}),
        ...(body.fromCity !== undefined ? { fromCity: body.fromCity } : {}),
        ...(body.toCountry !== undefined ? { toCountry: body.toCountry } : {}),
        ...(body.toCity !== undefined ? { toCity: body.toCity } : {}),
        ...(body.departAt !== undefined
          ? { departAt: new Date(body.departAt) }
          : {}),
        ...(body.weightKg !== undefined ? { weightKg: body.weightKg } : {}),
        ...(body.pricePerKgCad !== undefined
          ? { pricePerKgCad: body.pricePerKgCad }
          : {}),
        ...(body.currency !== undefined ? { currency: body.currency } : {}),
        ...(body.acceptedGoods !== undefined
          ? { acceptedGoods: body.acceptedGoods }
          : {}),
        ...(body.notes !== undefined ? { notes: body.notes || null } : {}),
        ...(body.airline !== undefined
          ? { airline: body.airline || null }
          : {}),
        ...(body.flightNumber !== undefined
          ? { flightNumber: body.flightNumber || null }
          : {}),
        ...(body.fromAirportCode !== undefined
          ? { fromAirportCode: body.fromAirportCode || null }
          : {}),
        ...(body.toAirportCode !== undefined
          ? { toAirportCode: body.toAirportCode || null }
          : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
      },
    });

    return NextResponse.json({ trip: updated });
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

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const { id } = await params;
  const trip = await prisma.trip.findUnique({ where: { id } });
  if (!trip) {
    return NextResponse.json({ error: "Voyage introuvable" }, { status: 404 });
  }
  if (trip.userId !== session.id && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const active = await prisma.booking.count({
    where: {
      tripId: id,
      status: { in: [...ACTIVE_BOOKING] },
    },
  });
  if (active > 0) {
    return NextResponse.json(
      {
        error:
          "Impossible de supprimer : une réservation active est en cours.",
        code: "ACTIVE_BOOKING",
      },
      { status: 409 }
    );
  }

  await prisma.trip.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
  return NextResponse.json({ ok: true });
}
