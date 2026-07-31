import { rankMatches, type MatchTripInput } from "@/lib/matching";
import { prisma } from "@/lib/prisma";

export async function loadShopOrderForDeliveryAccess(
  orderId: string,
  userId: string,
  role: string
) {
  const order = await prisma.shopOrder.findUnique({
    where: { id: orderId },
    include: {
      product: true,
      shop: {
        select: {
          id: true,
          name: true,
          userId: true,
          city: true,
          country: true,
          currency: true,
        },
      },
      parcelRequest: {
        select: {
          id: true,
          status: true,
          fromCountry: true,
          fromCity: true,
          toCountry: true,
          toCity: true,
          bookings: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true, status: true },
          },
        },
      },
    },
  });

  if (!order) return null;

  const isBuyer = order.buyerId === userId;
  const isSeller = order.shop.userId === userId;
  const isAdmin = role === "ADMIN";
  if (!isBuyer && !isSeller && !isAdmin) {
    return { order: null, forbidden: true as const, isBuyer, isSeller };
  }

  return { order, forbidden: false as const, isBuyer, isSeller };
}

/** Match open trips (shop → destination) and transport/transitaire services. */
export async function findDeliveryCarriers(input: {
  viewerId: string;
  fromCountry: string;
  fromCity: string;
  toCountry: string;
  toCity: string;
  weightKg?: number;
  limit?: number;
}) {
  const limit = input.limit ?? 12;
  const weightKg = input.weightKg && input.weightKg > 0 ? input.weightKg : 1;
  const fromCountry = input.fromCountry.trim().toUpperCase();
  const toCountry = input.toCountry.trim().toUpperCase();
  const fromCity = input.fromCity.trim();
  const toCity = input.toCity.trim();

  const trips = await prisma.trip.findMany({
    where: {
      status: "OPEN",
      userId: { not: input.viewerId },
      fromCountry,
      toCountry,
    },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          ratingAvg: true,
          ratingCount: true,
          verifiedAt: true,
          completedDeliveries: true,
        },
      },
    },
    orderBy: { departAt: "asc" },
    take: 80,
  });

  const matchInputs: MatchTripInput[] = trips.map((t) => ({
    id: t.id,
    toCountry: t.toCountry,
    toCity: t.toCity,
    fromCountry: t.fromCountry,
    fromCity: t.fromCity,
    departAt: t.departAt,
    weightKg: t.weightKg,
    pricePerKgCad: t.pricePerKgCad,
    currency: t.currency,
    user: t.user,
  }));

  const ranked = rankMatches(
    matchInputs,
    {
      fromCountry,
      fromCity,
      toCountry,
      toCity,
      weightKg,
      desiredDate: null,
    },
    limit
  );

  const services = await prisma.serviceListing.findMany({
    where: {
      status: "OPEN",
      userId: { not: input.viewerId },
      category: { in: ["transport", "transitaire"] },
      OR: [
        { country: fromCountry },
        { country: toCountry },
        {
          AND: [
            { country: fromCountry },
            { city: { contains: fromCity, mode: "insensitive" } },
          ],
        },
        {
          AND: [
            { country: toCountry },
            { city: { contains: toCity, mode: "insensitive" } },
          ],
        },
      ],
    },
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
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 8),
  });

  return {
    trips: ranked.map((m) => ({
      tripId: m.trip.id,
      score: m.score,
      fromCountry: m.trip.fromCountry,
      fromCity: m.trip.fromCity,
      toCountry: m.trip.toCountry,
      toCity: m.trip.toCity,
      departAt: m.trip.departAt,
      weightKg: m.trip.weightKg,
      pricePerKgCad: m.trip.pricePerKgCad,
      currency: m.trip.currency,
      user: m.trip.user,
    })),
    services: services.map((s) => ({
      id: s.id,
      title: s.title,
      category: s.category,
      serviceType: s.serviceType,
      country: s.country,
      city: s.city,
      priceAmount: s.priceAmount,
      priceUnit: s.priceUnit,
      currency: s.currency,
      user: s.user,
    })),
  };
}
