import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  fromCountry: z.string().min(2),
  fromCity: z.string().min(2),
  toCountry: z.string().min(2),
  toCity: z.string().min(2),
  weightKg: z.coerce.number().positive().max(100),
  description: z.string().min(5).max(2000),
  photos: z.array(z.string()).max(5).optional(),
  urgency: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  declaredValue: z.coerce.number().nonnegative().optional(),
  maxPricePerKg: z.coerce.number().positive().optional(),
  desiredDate: z.string().optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mine = searchParams.get("mine") === "1";
  const session = await getSessionUser();

  const requests = await prisma.parcelRequest.findMany({
    where: {
      status: "OPEN",
      ...(mine && session ? { userId: session.id } : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          ratingAvg: true,
          ratingCount: true,
          verifiedAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    requests: requests.map((r) => ({
      ...r,
      photos: JSON.parse(r.photosJson || "[]") as string[],
    })),
  });
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = schema.parse(await request.json());
    const parcel = await prisma.parcelRequest.create({
      data: {
        userId: session.id,
        fromCountry: body.fromCountry,
        fromCity: body.fromCity,
        toCountry: body.toCountry,
        toCity: body.toCity,
        weightKg: body.weightKg,
        description: body.description,
        photosJson: JSON.stringify(body.photos ?? []),
        urgency: body.urgency,
        declaredValue: body.declaredValue,
        maxPricePerKg: body.maxPricePerKg,
        desiredDate: body.desiredDate ? new Date(body.desiredDate) : null,
      },
    });
    return NextResponse.json({ request: parcel }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
