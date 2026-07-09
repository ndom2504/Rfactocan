import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rankMatches } from "@/lib/matching";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
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

  const trips = await prisma.trip.findMany({
    where: {
      status: "OPEN",
      userId: { not: parcel.userId },
      toCountry: parcel.toCountry,
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
          completedDeliveries: true,
        },
      },
    },
  });

  const matches = rankMatches(trips, {
    toCountry: parcel.toCountry,
    toCity: parcel.toCity,
    fromCountry: parcel.fromCountry,
    fromCity: parcel.fromCity,
    weightKg: parcel.weightKg,
    maxPricePerKg: parcel.maxPricePerKg,
    desiredDate: parcel.desiredDate,
  });

  return NextResponse.json({ matches });
}
