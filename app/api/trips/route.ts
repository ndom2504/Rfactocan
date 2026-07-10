import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  maxWeightForMode,
  normalizeTransportMode,
  type TransportMode,
} from "@/lib/transport";

const emptyToUndefined = (value: unknown) => {
  if (value == null) return undefined;
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
};

const schema = z
  .object({
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
      .positive("Poids invalide"),
    pricePerKgCad: z.coerce
      .number({ error: "Prix invalide" })
      .positive("Prix invalide")
      .max(500, "Prix max 500 / kg"),
    currency: z.preprocess(
      emptyToUndefined,
      z.enum(["CAD", "USD", "EUR", "XOF", "XAF"]).optional()
    ),
    transportMode: z.preprocess(
      emptyToUndefined,
      z.enum(["AIR", "SEA", "RAIL", "ROAD"]).optional()
    ),
    acceptedGoods: z.string().trim().min(2, "Objets acceptés requis"),
    notes: z.preprocess(emptyToUndefined, z.string().optional()),
    airline: z.preprocess(emptyToUndefined, z.string().optional()),
    flightNumber: z.preprocess(emptyToUndefined, z.string().optional()),
    fromAirportCode: z.preprocess(emptyToUndefined, z.string().optional()),
    toAirportCode: z.preprocess(emptyToUndefined, z.string().optional()),
  })
  .superRefine((data, ctx) => {
    const mode = normalizeTransportMode(data.transportMode);
    const max = maxWeightForMode(mode);
    if (data.weightKg > max) {
      ctx.addIssue({
        code: "custom",
        message: `Poids max ${max} kg pour ce mode de transport`,
        path: ["weightKg"],
      });
    }
  });

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mine = searchParams.get("mine") === "1";
  const toCountry = searchParams.get("toCountry") ?? undefined;
  const toCity = searchParams.get("toCity") ?? undefined;
  const modeParam = searchParams.get("transportMode");
  const transportMode = modeParam
    ? normalizeTransportMode(modeParam)
    : undefined;
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
      ...(transportMode ? { transportMode } : {}),
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
    const transportMode = normalizeTransportMode(
      body.transportMode
    ) as TransportMode;
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
        transportMode,
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
