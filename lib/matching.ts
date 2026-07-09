import { differenceInCalendarDays } from "date-fns";

export type MatchTripInput = {
  id: string;
  toCountry: string;
  toCity: string;
  fromCountry: string;
  fromCity: string;
  departAt: Date;
  weightKg: FloatOrNumber;
  pricePerKgCad: FloatOrNumber;
  user: {
    id: string;
    displayName: string;
    ratingAvg: number;
    ratingCount: number;
    verifiedAt: Date | null;
    avatarUrl: string | null;
  };
};

export type MatchRequestInput = {
  toCountry: string;
  toCity: string;
  fromCountry: string;
  fromCity: string;
  weightKg: FloatOrNumber;
  maxPricePerKg: FloatOrNumber | null;
  desiredDate: Date | null;
};

type FloatOrNumber = number;

export type MatchResult = {
  trip: MatchTripInput;
  score: number;
  breakdown: {
    destination: number;
    date: number;
    weight: number;
    price: number;
    rating: number;
  };
};

export function scoreTripAgainstRequest(
  trip: MatchTripInput,
  request: MatchRequestInput
): MatchResult {
  let destination = 0;
  if (trip.toCountry === request.toCountry && trip.toCity === request.toCity) {
    destination = 40;
  } else if (trip.toCountry === request.toCountry) {
    destination = 25;
  }

  let date = 0;
  if (request.desiredDate) {
    const days = Math.abs(
      differenceInCalendarDays(trip.departAt, request.desiredDate)
    );
    if (days <= 3) date = 25;
    else if (days <= 7) date = 15;
    else if (days <= 14) date = 8;
  } else {
    date = 12;
  }

  const weight = trip.weightKg >= request.weightKg ? 20 : 0;

  let price = 0;
  if (request.maxPricePerKg == null) {
    price = 5;
  } else if (trip.pricePerKgCad <= request.maxPricePerKg) {
    price = 10;
  } else if (trip.pricePerKgCad <= request.maxPricePerKg * 1.2) {
    price = 4;
  }

  const rating =
    trip.user.ratingCount === 0
      ? 2
      : Math.min(5, Math.round((trip.user.ratingAvg / 5) * 5));

  const score = destination + date + weight + price + rating;

  return {
    trip,
    score,
    breakdown: { destination, date, weight, price, rating },
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
