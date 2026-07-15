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
  weightKg: z.coerce.number().positive().max(100).optional(),
  description: z.string().min(5).max(2000).optional(),
  photos: z.array(z.string()).max(5).optional(),
  urgency: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  declaredValue: z.coerce.number().nonnegative().optional().nullable(),
  desiredDate: z.string().optional().nullable(),
  transportMode: z.enum(["AIR", "SEA", "RAIL", "ROAD"]).optional().nullable(),
  transportType: z.string().optional().nullable(),
  status: z.enum(["OPEN", "MATCHED", "CLOSED", "CANCELLED"]).optional(),
});

const ACTIVE_BOOKING = [
  "PROPOSED",
  "AWAITING_PAYMENT",
  "ACCEPTED",
  "HANDED_OVER",
  "IN_TRANSIT",
] as const;

export async function GET(_request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const parcel = await prisma.parcelRequest.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          ratingAvg: true,
          ratingCount: true,
          verifiedAt: true,
        },
      },
    },
  });

  if (!parcel) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }

  return NextResponse.json({
    request: {
      ...parcel,
      photos: JSON.parse(parcel.photosJson || "[]") as string[],
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
    const parcel = await prisma.parcelRequest.findUnique({ where: { id } });
    if (!parcel) {
      return NextResponse.json(
        { error: "Demande introuvable" },
        { status: 404 }
      );
    }
    if (parcel.userId !== session.id && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Interdit" }, { status: 403 });
    }
    if (parcel.status === "CANCELLED" || parcel.status === "CLOSED") {
      return NextResponse.json(
        { error: "Cette demande ne peut plus être modifiée." },
        { status: 400 }
      );
    }

    const body = patchSchema.parse(await request.json());
    const updated = await prisma.parcelRequest.update({
      where: { id },
      data: {
        ...(body.fromCountry !== undefined
          ? { fromCountry: body.fromCountry }
          : {}),
        ...(body.fromCity !== undefined ? { fromCity: body.fromCity } : {}),
        ...(body.toCountry !== undefined ? { toCountry: body.toCountry } : {}),
        ...(body.toCity !== undefined ? { toCity: body.toCity } : {}),
        ...(body.weightKg !== undefined ? { weightKg: body.weightKg } : {}),
        ...(body.description !== undefined
          ? { description: body.description }
          : {}),
        ...(body.photos !== undefined
          ? { photosJson: JSON.stringify(body.photos) }
          : {}),
        ...(body.urgency !== undefined ? { urgency: body.urgency } : {}),
        ...(body.declaredValue !== undefined
          ? { declaredValue: body.declaredValue }
          : {}),
        ...(body.desiredDate !== undefined
          ? {
              desiredDate: body.desiredDate
                ? new Date(body.desiredDate)
                : null,
            }
          : {}),
        ...(body.transportMode !== undefined
          ? { transportMode: body.transportMode || null }
          : {}),
        ...(body.transportType !== undefined
          ? { transportType: body.transportType || null }
          : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
      },
    });

    return NextResponse.json({
      request: {
        ...updated,
        photos: JSON.parse(updated.photosJson || "[]") as string[],
      },
    });
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
  const parcel = await prisma.parcelRequest.findUnique({ where: { id } });
  if (!parcel) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }
  if (parcel.userId !== session.id && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const active = await prisma.booking.count({
    where: {
      requestId: id,
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

  await prisma.parcelRequest.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
  return NextResponse.json({ ok: true });
}
