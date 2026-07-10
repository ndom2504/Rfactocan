import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { rankRequestsForTrip } from "@/lib/matching";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

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
          completedDeliveries: true,
        },
      },
    },
  });
  if (!trip) {
    return NextResponse.json({ error: "Voyage introuvable" }, { status: 404 });
  }
  if (trip.userId !== session.id && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const requests = await prisma.parcelRequest.findMany({
    where: {
      status: "OPEN",
      userId: { not: trip.userId },
      toCountry: trip.toCountry,
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
  });

  const matches = rankRequestsForTrip(
    {
      id: trip.id,
      toCountry: trip.toCountry,
      toCity: trip.toCity,
      fromCountry: trip.fromCountry,
      fromCity: trip.fromCity,
      departAt: trip.departAt,
      weightKg: trip.weightKg,
      pricePerKgCad: trip.pricePerKgCad,
      currency: trip.currency,
      user: trip.user,
    },
    requests.map((r) => ({
      id: r.id,
      toCountry: r.toCountry,
      toCity: r.toCity,
      fromCountry: r.fromCountry,
      fromCity: r.fromCity,
      weightKg: r.weightKg,
      desiredDate: r.desiredDate,
      description: r.description,
      urgency: r.urgency,
      photosJson: r.photosJson,
      user: r.user,
    }))
  );

  return NextResponse.json({
    matches: matches.map((m) => ({
      ...m,
      request: {
        ...m.request,
        photos: JSON.parse(m.request.photosJson || "[]") as string[],
      },
    })),
  });
}
