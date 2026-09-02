import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { openRequestDateWhere, openTripDateWhere } from "@/lib/listing-freshness";
import { prisma } from "@/lib/prisma";
import { toReadableMediaUrl } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      displayName: true,
      avatarUrl: true,
      bannerUrl: true,
      bio: true,
      country: true,
      kycStatus: true,
      ratingAvg: true,
      ratingCount: true,
      completedDeliveries: true,
      createdAt: true,
      status: true,
    },
  });

  if (!user || user.status === "SUSPENDED") {
    return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
  }

  let connectionCount = 0;
  let connectedByMe = false;
  let connections: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    verified: boolean;
  }[] = [];

  try {
    const [count, myLink, followerRows] = await Promise.all([
      prisma.userConnection.count({ where: { followingId: user.id } }),
      prisma.userConnection.findUnique({
        where: {
          followerId_followingId: {
            followerId: session.id,
            followingId: user.id,
          },
        },
        select: { id: true },
      }),
      prisma.userConnection.findMany({
        where: { followingId: user.id },
        orderBy: { createdAt: "desc" },
        take: 40,
        select: {
          follower: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              kycStatus: true,
            },
          },
        },
      }),
    ]);
    connectionCount = count;
    connectedByMe = Boolean(myLink);
    connections = followerRows.map((row) => ({
      id: row.follower.id,
      displayName: row.follower.displayName,
      avatarUrl: toReadableMediaUrl(row.follower.avatarUrl),
      verified: row.follower.kycStatus === "VERIFIED",
    }));
  } catch (error) {
    console.error("Member connections query failed:", error);
  }

  let trips: Awaited<ReturnType<typeof prisma.trip.findMany>> = [];
  let services: Awaited<ReturnType<typeof prisma.serviceListing.findMany>> = [];
  let shops: Awaited<ReturnType<typeof prisma.shop.findMany>> = [];
  let parcels: Awaited<ReturnType<typeof prisma.parcelRequest.findMany>> = [];

  try {
    [trips, services, shops, parcels] = await Promise.all([
    prisma.trip.findMany({
      where: {
        userId: user.id,
        status: "OPEN",
        AND: [openTripDateWhere()],
      },
      orderBy: { departAt: "asc" },
      take: 20,
      select: {
        id: true,
        fromCity: true,
        toCity: true,
        fromCountry: true,
        toCountry: true,
        departAt: true,
        arriveAt: true,
      },
    }),
    prisma.serviceListing.findMany({
      where: { userId: user.id, status: "OPEN" },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        city: true,
        country: true,
      },
    }),
    prisma.shop.findMany({
      where: { userId: user.id, status: "OPEN" },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: {
        id: true,
        name: true,
        city: true,
        country: true,
        category: true,
      },
    }),
    prisma.parcelRequest.findMany({
      where: {
        userId: user.id,
        status: "OPEN",
        needType: "PARCEL",
        AND: [openRequestDateWhere()],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        fromCity: true,
        toCity: true,
        fromCountry: true,
        toCountry: true,
        desiredDate: true,
      },
    }),
  ]);
  } catch (error) {
    console.error("Member projects query failed:", error);
  }

  return NextResponse.json({
    user: {
      id: user.id,
      displayName: user.displayName,
      avatarUrl: toReadableMediaUrl(user.avatarUrl),
      bannerUrl: toReadableMediaUrl(user.bannerUrl),
      bio: user.bio,
      country: user.country,
      verified: user.kycStatus === "VERIFIED",
      ratingAvg: user.ratingAvg,
      ratingCount: user.ratingCount,
      completedDeliveries: user.completedDeliveries,
      createdAt: user.createdAt,
      isOwner: session.id === user.id,
      connectionCount,
      connectedByMe,
    },
    stats: {
      connections: connectionCount,
      deliveries: user.completedDeliveries,
      ratingAvg: user.ratingAvg,
      ratingCount: user.ratingCount,
      trips: trips.length,
      services: services.length,
      shops: shops.length,
      parcels: parcels.length,
    },
    connections,
    projects: {
      trips,
      services,
      shops,
      parcels,
    },
  });
}
