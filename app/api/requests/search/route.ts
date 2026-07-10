import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { countryCodesForRegion } from "@/lib/regions";
import { prisma } from "@/lib/prisma";

/**
 * Quick parcel-request search for dashboard (travelers looking for senders).
 * Filters open requests by q / country / city / region (destination or origin).
 */
export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const country = (searchParams.get("country") ?? "").trim().toUpperCase();
  const city = (searchParams.get("city") ?? "").trim();
  const region = (searchParams.get("region") ?? "").trim();
  const limit = Math.min(Number(searchParams.get("limit") ?? 20) || 20, 50);

  const regionCodes = region ? countryCodesForRegion(region) : [];

  const requests = await prisma.parcelRequest.findMany({
    where: {
      status: "OPEN",
      userId: { not: session.id },
      ...(country
        ? {
            OR: [{ toCountry: country }, { fromCountry: country }],
          }
        : {}),
      ...(city
        ? {
            OR: [
              { toCity: { contains: city, mode: "insensitive" } },
              { fromCity: { contains: city, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(regionCodes.length
        ? {
            OR: [
              { toCountry: { in: regionCodes } },
              { fromCountry: { in: regionCodes } },
            ],
          }
        : {}),
      ...(q
        ? {
            OR: [
              { user: { displayName: { contains: q, mode: "insensitive" } } },
              { fromCity: { contains: q, mode: "insensitive" } },
              { toCity: { contains: q, mode: "insensitive" } },
              { fromCountry: { contains: q, mode: "insensitive" } },
              { toCountry: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          country: true,
          ratingAvg: true,
          ratingCount: true,
          verifiedAt: true,
          kycStatus: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({
    requests: requests.map((r) => ({
      requestId: r.id,
      fromCountry: r.fromCountry,
      fromCity: r.fromCity,
      toCountry: r.toCountry,
      toCity: r.toCity,
      weightKg: r.weightKg,
      urgency: r.urgency,
      desiredDate: r.desiredDate,
      description: r.description,
      photos: JSON.parse(r.photosJson || "[]") as string[],
      user: r.user,
    })),
  });
}
