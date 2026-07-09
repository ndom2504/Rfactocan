import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  fromCountry: z.string().min(2),
  fromCity: z.string().min(2),
  toCountry: z.string().min(2),
  toCity: z.string().min(2),
  departAt: z.string().datetime().or(z.string().min(8)),
  weightKg: z.coerce.number().positive().max(100),
  pricePerKgCad: z.coerce.number().positive().max(500),
  currency: z.enum(["CAD", "USD", "EUR"]).optional(),
  acceptedGoods: z.string().min(2),
  notes: z.string().optional(),
  airline: z.string().optional(),
  flightNumber: z.string().optional(),
  fromAirportCode: z.string().optional(),
  toAirportCode: z.string().optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mine = searchParams.get("mine") === "1";
  const toCountry = searchParams.get("toCountry") ?? undefined;
  const toCity = searchParams.get("toCity") ?? undefined;
  const session = await getSessionUser();

  const trips = await prisma.trip.findMany({
    where: {
      status: "OPEN",
      ...(mine && session ? { userId: session.id } : {}),
      ...(toCountry ? { toCountry } : {}),
      ...(toCity ? { toCity } : {}),
    },
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
    orderBy: { departAt: "asc" },
  });

  return NextResponse.json({ trips });
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = schema.parse(await request.json());
    const trip = await prisma.trip.create({
      data: {
        userId: session.id,
        fromCountry: body.fromCountry,
        fromCity: body.fromCity,
        toCountry: body.toCountry,
        toCity: body.toCity,
        departAt: new Date(body.departAt),
        weightKg: body.weightKg,
        pricePerKgCad: body.pricePerKgCad,
        currency: body.currency ?? "CAD",
        acceptedGoods: body.acceptedGoods,
        notes: body.notes,
        airline: body.airline,
        flightNumber: body.flightNumber,
        fromAirportCode: body.fromAirportCode,
        toAirportCode: body.toAirportCode,
      },
    });
    return NextResponse.json({ trip }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
