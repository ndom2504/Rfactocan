import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { countryCodesForRegion } from "@/lib/regions";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Quick open-request search for dashboard.
 * - Clients / colis: needType=PARCEL (default)
 * - Emplois: needType=JOB (JOB_SEEK + JOB_OFFER)
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
  const date = (searchParams.get("date") ?? "").trim();
  const needTypeParam = (searchParams.get("needType") ?? "PARCEL").trim().toUpperCase();
  const limit = Math.min(Number(searchParams.get("limit") ?? 20) || 20, 50);

  let needTypeFilter: Prisma.ParcelRequestWhereInput["needType"];
  if (needTypeParam === "JOB" || needTypeParam === "JOBS") {
    needTypeFilter = { in: ["JOB_SEEK", "JOB_OFFER"] };
  } else if (
    needTypeParam === "JOB_SEEK" ||
    needTypeParam === "JOB_OFFER" ||
    needTypeParam === "PARCEL" ||
    needTypeParam === "SERVICE" ||
    needTypeParam === "PRODUCT"
  ) {
    needTypeFilter = needTypeParam as
      | "JOB_SEEK"
      | "JOB_OFFER"
      | "PARCEL"
      | "SERVICE"
      | "PRODUCT";
  } else if (needTypeParam === "ALL") {
    needTypeFilter = undefined;
  } else {
    needTypeFilter = "PARCEL";
  }

  const isJobSearch =
    needTypeParam === "JOB" ||
    needTypeParam === "JOBS" ||
    needTypeParam === "JOB_SEEK" ||
    needTypeParam === "JOB_OFFER";

  const regionCodes = region ? countryCodesForRegion(region) : [];

  let dateFilter: { gte: Date; lt: Date } | undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    if (!Number.isNaN(start.getTime())) {
      dateFilter = { gte: start, lt: end };
    }
  }

  const requests = await prisma.parcelRequest.findMany({
    where: {
      status: "OPEN",
      userId: { not: session.id },
      ...(needTypeFilter ? { needType: needTypeFilter } : {}),
      ...(dateFilter ? { desiredDate: dateFilter } : {}),
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
              ...(isJobSearch
                ? [
                    {
                      jobTitle: {
                        contains: q,
                        mode: "insensitive" as const,
                      },
                    },
                    {
                      jobSector: {
                        contains: q,
                        mode: "insensitive" as const,
                      },
                    },
                    {
                      jobDiploma: {
                        contains: q,
                        mode: "insensitive" as const,
                      },
                    },
                  ]
                : []),
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
      needType: r.needType,
      fromCountry: r.fromCountry,
      fromCity: r.fromCity,
      toCountry: r.toCountry,
      toCity: r.toCity,
      weightKg: r.weightKg,
      urgency: r.urgency,
      desiredDate: r.desiredDate,
      description: r.description,
      photos: JSON.parse(r.photosJson || "[]") as string[],
      jobTitle: r.jobTitle,
      jobSector: r.jobSector,
      jobExperience: r.jobExperience,
      jobDiploma: r.jobDiploma,
      jobCvUrl: r.jobCvUrl,
      user: r.user,
    })),
  });
}
