import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const emptyToUndefined = (value: unknown) => {
  if (value == null) return undefined;
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
};

const schema = z.object({
  fromCountry: z.string().trim().min(2, "Pays de départ requis"),
  fromCity: z.string().trim().min(2, "Ville de départ requise"),
  toCountry: z.string().trim().min(2, "Pays d'arrivée requis"),
  toCity: z.string().trim().min(2, "Ville d'arrivée requise"),
  departAt: z
    .string()
    .min(1, "Date de départ requise")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Date de départ invalide"),
  weightKg: z.coerce
    .number({ error: "Poids invalide" })
    .positive("Poids invalide")
    .max(100, "Poids max 100 kg"),
  pricePerKgCad: z.coerce
    .number({ error: "Prix invalide" })
    .positive("Prix invalide")
    .max(500, "Prix max 500 / kg"),
  currency: z.preprocess(
    emptyToUndefined,
    z.enum(["CAD", "USD", "EUR", "XOF", "XAF"]).optional()
  ),
  acceptedGoods: z.string().trim().min(2, "Objets acceptés requis"),
  notes: z.preprocess(emptyToUndefined, z.string().optional()),
  airline: z.preprocess(emptyToUndefined, z.string().optional()),
  flightNumber: z.preprocess(emptyToUndefined, z.string().optional()),
  fromAirportCode: z.preprocess(emptyToUndefined, z.string().optional()),
  toAirportCode: z.preprocess(emptyToUndefined, z.string().optional()),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mine = searchParams.get("mine") === "1";
  const toCountry = searchParams.get("toCountry") ?? undefined;
  const toCity = searchParams.get("toCity") ?? undefined;
  const session = await getSessionUser();

  if (mine && !session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

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
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Données invalides" },
        { status: 400 }
      );
    }
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
