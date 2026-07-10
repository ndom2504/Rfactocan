import { differenceInCalendarDays } from "date-fns";

export type MatchTripInput = {
  id: string;
  toCountry: string;
  toCity: string;
  fromCountry: string;
  fromCity: string;
  departAt: Date;
  weightKg: number;
  pricePerKgCad: number;
  user: {
    id: string;
    displayName: string;
    ratingAvg: number;
    ratingCount: number;
    verifiedAt: Date | null;
    avatarUrl: string | null;
    completedDeliveries?: number;
  };
};

export type MatchRequestInput = {
  toCountry: string;
  toCity: string;
  fromCountry: string;
  fromCity: string;
  weightKg: number;
  desiredDate: Date | null;
};

/**
 * Score Rfacto mondial (0–100)
 * 45% route · 25% date · 18% réputation · 12% historique
 * (le prix est fixé uniquement par le voyageur, hors score demande)
 */
export type MatchResult = {
  trip: MatchTripInput;
  score: number;
  breakdown: {
    route: number;
    date: number;
    reputation: number;
    history: number;
  };
};

function normalizeCity(value: string) {
  return value.trim().toLowerCase();
}

export function scoreTripAgainstRequest(
  trip: MatchTripInput,
  request: MatchRequestInput
): MatchResult {
  // Route 45%
  let route = 0;
  const sameToCountry = trip.toCountry === request.toCountry;
  const sameToCity =
    sameToCountry &&
    normalizeCity(trip.toCity) === normalizeCity(request.toCity);
  const sameFromCountry = trip.fromCountry === request.fromCountry;
  const sameFromCity =
    sameFromCountry &&
    normalizeCity(trip.fromCity) === normalizeCity(request.fromCity);

  if (sameToCity && sameFromCity) route = 45;
  else if (sameToCity && sameFromCountry) route = 40;
  else if (sameToCity) route = 36;
  else if (sameToCountry && sameFromCountry) route = 32;
  else if (sameToCountry) route = 24;
  else if (sameFromCountry) route = 10;

  // Poids : si insuffisant, pénalité forte sur le score route
  if (trip.weightKg < request.weightKg) {
    route = Math.max(0, route - 18);
  }

  // Date 25%
  let date = 0;
  if (request.desiredDate) {
    const days = Math.abs(
      differenceInCalendarDays(trip.departAt, request.desiredDate)
    );
    if (days === 0) date = 25;
    else if (days <= 2) date = 22;
    else if (days <= 5) date = 17;
    else if (days <= 10) date = 10;
    else if (days <= 20) date = 5;
  } else {
    date = 12;
  }

  // Réputation 18%
  const reputation =
    trip.user.ratingCount === 0
      ? 7
      : Math.round((trip.user.ratingAvg / 5) * 18);

  // Historique 12%
  const deliveries = trip.user.completedDeliveries ?? 0;
  const history = Math.min(
    12,
    Math.floor(deliveries / 2) + (deliveries > 0 ? 2 : 0)
  );

  const score = Math.min(100, route + date + reputation + history);

  return {
    trip,
    score,
    breakdown: { route, date, reputation, history },
  };
}

export function rankMatches(
  trips: MatchTripInput[],
  request: MatchRequestInput,
  limit = 10
): MatchResult[] {
  return trips
    .map((trip) => scoreTripAgainstRequest(trip, request))
    .filter((m) => m.score >= 25)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export type MatchRequestWithMeta = MatchRequestInput & {
  id: string;
  description: string;
  urgency: string;
  photosJson?: string;
  user: {
    id: string;
    displayName: string;
    ratingAvg: number;
    ratingCount: number;
    verifiedAt: Date | null;
    avatarUrl: string | null;
  };
};

export type RequestMatchResult = {
  request: MatchRequestWithMeta;
  score: number;
  breakdown: MatchResult["breakdown"];
};

/** Inverse matching: rank open requests against a traveler's trip. */
export function rankRequestsForTrip(
  trip: MatchTripInput,
  requests: MatchRequestWithMeta[],
  limit = 10
): RequestMatchResult[] {
  return requests
    .map((request) => {
      const scored = scoreTripAgainstRequest(trip, request);
      return {
        request,
        score: scored.score,
        breakdown: scored.breakdown,
      };
    })
    .filter((m) => m.score >= 25)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
