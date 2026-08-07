import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rankMatches } from "@/lib/matching";
import { normalizeOrderNeedType } from "@/lib/order-need";

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

  const needType = normalizeOrderNeedType(parcel.needType);

  if (needType === "SERVICE") {
    const listings = await prisma.serviceListing.findMany({
      where: {
        status: "OPEN",
        userId: { not: parcel.userId },
        ...(parcel.serviceCategory
          ? { category: parcel.serviceCategory }
          : {}),
        ...(parcel.serviceType ? { serviceType: parcel.serviceType } : {}),
        country: parcel.toCountry,
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
            kycStatus: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    });

    const matches = listings
      .map((listing) => {
        let score = 40;
        if (
          listing.city.toLowerCase() === parcel.toCity.toLowerCase()
        ) {
          score += 40;
        }
        if (
          parcel.serviceType &&
          listing.serviceType === parcel.serviceType
        ) {
          score += 20;
        }
        return {
          kind: "service" as const,
          score,
          listing: {
            id: listing.id,
            title: listing.title,
            category: listing.category,
            serviceType: listing.serviceType,
            country: listing.country,
            city: listing.city,
            priceAmount: listing.priceAmount,
            priceUnit: listing.priceUnit,
            currency: listing.currency,
            description: listing.description,
            photos: JSON.parse(listing.photosJson || "[]") as string[],
            user: listing.user,
          },
        };
      })
      .sort((a, b) => b.score - a.score);

    return NextResponse.json({ needType, matches, matchKind: "service" });
  }

  if (needType === "PRODUCT") {
    const products = await prisma.shopProduct.findMany({
      where: {
        active: true,
        shop: {
          status: "OPEN",
          userId: { not: parcel.userId },
          ...(parcel.productCategory
            ? { category: parcel.productCategory }
            : {}),
        },
      },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            category: true,
            country: true,
            city: true,
            currency: true,
            userId: true,
            status: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 40,
    });

    const matches = products
      .filter((product) => product.shop != null)
      .map((product) => {
        const shop = product.shop;
        let score = 30;
        if (
          shop.country.toLowerCase() === parcel.toCountry.toLowerCase()
        ) {
          score += 25;
        }
        if (shop.city.toLowerCase() === parcel.toCity.toLowerCase()) {
          score += 25;
        }
        const title = product.title.toLowerCase();
        const desc = parcel.description.toLowerCase();
        const keywords = desc
          .split(/\W+/)
          .filter((w) => w.length > 3)
          .slice(0, 8);
        if (keywords.some((k) => title.includes(k))) score += 20;
        return {
          kind: "product" as const,
          score,
          product: {
            id: product.id,
            title: product.title,
            description: product.description,
            priceCents: product.priceCents,
            photoUrl: product.photoUrl,
            shop: {
              id: shop.id,
              name: shop.name,
              category: shop.category,
              country: shop.country,
              city: shop.city,
              currency: shop.currency,
            },
          },
        };
      })
      .sort((a, b) => b.score - a.score);

    return NextResponse.json({ needType, matches, matchKind: "product" });
  }

  // JOB_SEEK ↔ JOB_OFFER (mise en relation emploi)
  if (needType === "JOB_SEEK" || needType === "JOB_OFFER") {
    const targetNeed =
      needType === "JOB_SEEK" ? ("JOB_OFFER" as const) : ("JOB_SEEK" as const);

    const candidates = await prisma.parcelRequest.findMany({
      where: {
        status: "OPEN",
        needType: targetNeed,
        userId: { not: parcel.userId },
        ...(parcel.jobSector ? { jobSector: parcel.jobSector } : {}),
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
            kycStatus: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const expRank: Record<string, number> = {
      junior: 1,
      mid: 2,
      senior: 3,
      expert: 4,
    };

    const matches = candidates
      .map((other) => {
        let score = 25;
        if (
          parcel.jobSector &&
          other.jobSector &&
          parcel.jobSector === other.jobSector
        ) {
          score += 35;
        }
        if (
          other.toCountry.toLowerCase() === parcel.toCountry.toLowerCase()
        ) {
          score += 20;
        }
        if (other.toCity.toLowerCase() === parcel.toCity.toLowerCase()) {
          score += 15;
        }
        const a = expRank[parcel.jobExperience || ""] ?? 0;
        const b = expRank[other.jobExperience || ""] ?? 0;
        if (a && b) {
          const diff = Math.abs(a - b);
          if (diff === 0) score += 10;
          else if (diff === 1) score += 5;
        }
        return {
          kind: "job" as const,
          score: Math.min(score, 100),
          request: {
            id: other.id,
            needType: other.needType,
            jobTitle: other.jobTitle,
            jobSector: other.jobSector,
            jobExperience: other.jobExperience,
            jobDiploma: other.jobDiploma,
            jobCvUrl: other.jobCvUrl,
            country: other.toCountry,
            city: other.toCity,
            description: other.description,
            photos: JSON.parse(other.photosJson || "[]") as string[],
            user: other.user,
          },
        };
      })
      .sort((a, b) => b.score - a.score);

    return NextResponse.json({
      needType,
      matches,
      matchKind: "job",
      fromRequestId: parcel.id,
    });
  }

  // PARCEL → trips
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
          kycStatus: true,
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
    desiredDate: parcel.desiredDate,
  }).map((m) => ({ kind: "trip" as const, ...m }));

  return NextResponse.json({ needType: "PARCEL", matches, matchKind: "trip" });
}
