import { notifyUser } from "@/lib/notifications";
import { sendFcmToUsers } from "@/lib/fcm";
import { prisma } from "@/lib/prisma";

const NEARBY_RADIUS_KM = 50;
const MAX_RECIPIENTS = 100;

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function resolveCityCoords(country: string, city: string) {
  const countryTrim = country.trim();
  const cityTrim = city.trim();
  if (!countryTrim || !cityTrim) return null;

  const codeGuess = countryTrim.length === 2 ? countryTrim.toUpperCase() : null;

  const row = await prisma.city.findFirst({
    where: {
      active: true,
      name: { equals: cityTrim, mode: "insensitive" },
      OR: [
        ...(codeGuess ? [{ countryCode: codeGuess }] : []),
        { country: { name: { equals: countryTrim, mode: "insensitive" } } },
        { countryCode: { equals: countryTrim, mode: "insensitive" } },
      ],
      latitude: { not: null },
      longitude: { not: null },
    },
    select: { latitude: true, longitude: true, countryCode: true, name: true },
  });

  if (!row?.latitude || !row?.longitude) return null;
  return {
    lat: row.latitude,
    lng: row.longitude,
    countryCode: row.countryCode,
    cityName: row.name,
  };
}

type Candidate = {
  id: string;
  country: string | null;
  lastLat: number | null;
  lastLng: number | null;
  tripCities: { fromCountry: string; fromCity: string; toCountry: string; toCity: string }[];
};

function isInZone(
  candidate: Candidate,
  zone: {
    country: string;
    city: string;
    lat: number | null;
    lng: number | null;
  }
): boolean {
  const countryNorm = zone.country.trim().toLowerCase();
  const cityNorm = zone.city.trim().toLowerCase();

  const countryMatch = (c: string | null | undefined) => {
    if (!c) return false;
    const n = c.trim().toLowerCase();
    return n === countryNorm;
  };

  const cityMatch = (c: string | null | undefined) => {
    if (!c) return false;
    return c.trim().toLowerCase() === cityNorm;
  };

  // Open trips that touch the zone city
  for (const t of candidate.tripCities) {
    if (
      (countryMatch(t.fromCountry) && cityMatch(t.fromCity)) ||
      (countryMatch(t.toCountry) && cityMatch(t.toCity))
    ) {
      return true;
    }
  }

  // GPS within radius of the job city
  if (
    zone.lat != null &&
    zone.lng != null &&
    candidate.lastLat != null &&
    candidate.lastLng != null
  ) {
    if (
      haversineKm(zone.lat, zone.lng, candidate.lastLat, candidate.lastLng) <=
      NEARBY_RADIUS_KM
    ) {
      return true;
    }
  }

  return false;
}

async function loadCandidates(roles: ("TRAVELER" | "SENDER" | "BOTH")[]) {
  const users = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      nearbyAlertsEnabled: true,
      role: { in: roles },
      deviceTokens: { some: {} },
    },
    select: {
      id: true,
      country: true,
      lastLat: true,
      lastLng: true,
      trips: {
        where: { status: "OPEN" },
        select: {
          fromCountry: true,
          fromCity: true,
          toCountry: true,
          toCity: true,
        },
        take: 20,
      },
    },
    take: 500,
  });

  return users.map((u) => ({
    id: u.id,
    country: u.country,
    lastLat: u.lastLat,
    lastLng: u.lastLng,
    tripCities: u.trips,
  }));
}

async function notifyRecipients(input: {
  excludeUserId: string;
  userIds: string[];
  type: string;
  title: string;
  body: string;
  href: string;
  data: Record<string, string>;
}) {
  const ids = [...new Set(input.userIds)]
    .filter((id) => id && id !== input.excludeUserId)
    .slice(0, MAX_RECIPIENTS);

  await Promise.all(
    ids.map((userId) =>
      notifyUser({
        userId,
        type: input.type,
        title: input.title,
        body: input.body,
        href: input.href,
      })
    )
  );

  await sendFcmToUsers({
    userIds: ids,
    title: input.title,
    body: input.body,
    data: input.data,
  });

  return ids.length;
}

export async function notifyNearbyForRequest(request: {
  id: string;
  userId: string;
  fromCountry: string;
  fromCity: string;
  toCountry: string;
  toCity: string;
  weightKg: number;
}) {
  const coords = await resolveCityCoords(request.fromCountry, request.fromCity);
  const zone = {
    country: request.fromCountry,
    city: request.fromCity,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
  };

  const candidates = await loadCandidates(["TRAVELER", "BOTH"]);
  const matched = candidates
    .filter((c) => c.id !== request.userId && isInZone(c, zone))
    .map((c) => c.id);

  const title = "Nouvelle commande près de vous";
  const body = `${request.fromCity} → ${request.toCity} · ${request.weightKg} kg`;
  const href = `/requests/${request.id}`;

  return notifyRecipients({
    excludeUserId: request.userId,
    userIds: matched,
    type: "nearby_request",
    title,
    body,
    href,
    data: {
      type: "nearby_request",
      requestId: request.id,
      href,
    },
  });
}

export async function notifyNearbyForService(listing: {
  id: string;
  userId: string;
  title: string;
  country: string;
  city: string;
  category: string;
}) {
  const coords = await resolveCityCoords(listing.country, listing.city);
  const zone = {
    country: listing.country,
    city: listing.city,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
  };

  const candidates = await loadCandidates(["SENDER", "BOTH"]);
  const matched = candidates
    .filter((c) => c.id !== listing.userId && isInZone(c, zone))
    .map((c) => c.id);

  const title = "Nouveau service près de vous";
  const body = `${listing.title} · ${listing.city}`;
  const href = `/services/listing/${listing.id}`;

  return notifyRecipients({
    excludeUserId: listing.userId,
    userIds: matched,
    type: "nearby_service",
    title,
    body,
    href,
    data: {
      type: "nearby_service",
      listingId: listing.id,
      href,
    },
  });
}
