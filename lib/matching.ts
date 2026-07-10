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
  maxPricePerKg: number | null;
  desiredDate: Date | null;
};

/**
 * Score Rfacto mondial (0–100)
 * 40% route · 20% date · 15% prix · 15% réputation · 10% historique
 * (+ bonus poids inclus dans route/compatibilité opérationnelle)
 */
export type MatchResult = {
  trip: MatchTripInput;
  score: number;
  breakdown: {
    route: number;
    date: number;
    price: number;
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
  // Route 40%
  let route = 0;
  const sameToCountry = trip.toCountry === request.toCountry;
  const sameToCity =
    sameToCountry &&
    normalizeCity(trip.toCity) === normalizeCity(request.toCity);
  const sameFromCountry = trip.fromCountry === request.fromCountry;
  const sameFromCity =
    sameFromCountry &&
    normalizeCity(trip.fromCity) === normalizeCity(request.fromCity);

  if (sameToCity && sameFromCity) route = 40;
  else if (sameToCity && sameFromCountry) route = 36;
  else if (sameToCity) route = 32;
  else if (sameToCountry && sameFromCountry) route = 28;
  else if (sameToCountry) route = 22;
  else if (sameFromCountry) route = 8;

  // Poids : si insuffisant, pénalité forte sur le score route
  if (trip.weightKg < request.weightKg) {
    route = Math.max(0, route - 18);
  }

  // Date 20%
  let date = 0;
  if (request.desiredDate) {
    const days = Math.abs(
      differenceInCalendarDays(trip.departAt, request.desiredDate)
    );
    if (days === 0) date = 20;
    else if (days <= 2) date = 18;
    else if (days <= 5) date = 14;
    else if (days <= 10) date = 8;
    else if (days <= 20) date = 4;
  } else {
    date = 10;
  }

  // Prix 15%
  let price = 0;
  if (request.maxPricePerKg == null) {
    price = 8;
  } else if (trip.pricePerKgCad <= request.maxPricePerKg) {
    price = 15;
  } else if (trip.pricePerKgCad <= request.maxPricePerKg * 1.15) {
    price = 8;
  } else if (trip.pricePerKgCad <= request.maxPricePerKg * 1.35) {
    price = 3;
  }

  // Réputation 15%
  const reputation =
    trip.user.ratingCount === 0
      ? 6
      : Math.round((trip.user.ratingAvg / 5) * 15);

  // Historique 10%
  const deliveries = trip.user.completedDeliveries ?? 0;
  const history = Math.min(10, Math.floor(deliveries / 2) + (deliveries > 0 ? 2 : 0));

  const score = Math.min(100, route + date + price + reputation + history);

  return {
    trip,
    score,
    breakdown: { route, date, price, reputation, history },
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
