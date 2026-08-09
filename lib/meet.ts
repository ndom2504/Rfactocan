import type { MeetGender, MeetKind, MeetProfile } from "@prisma/client";

export type MeetProfilePublic = {
  id: string;
  userId: string;
  kind: MeetKind;
  headline: string;
  bio: string | null;
  myGender: MeetGender;
  birthYear: number | null;
  age: number | null;
  city: string | null;
  country: string | null;
  seekGender: MeetGender;
  ageMin: number | null;
  ageMax: number | null;
  interests: string | null;
  photoUrl: string | null;
  photoVisible: boolean;
  active: boolean;
  matchScore?: number;
  updatedAt: Date | string;
  createdAt: Date | string;
};

export function ageFromBirthYear(
  birthYear: number | null | undefined,
  now = new Date()
): number | null {
  if (!birthYear || birthYear < 1920 || birthYear > now.getFullYear() - 16) {
    return null;
  }
  return now.getFullYear() - birthYear;
}

function normalizePlace(value: string | null | undefined) {
  return (value || "").trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

/** Preferential match score; negative = incompatible with hard criteria. */
export function scoreMeetMatch(
  me: Pick<
    MeetProfile,
    | "kind"
    | "myGender"
    | "birthYear"
    | "city"
    | "country"
    | "seekGender"
    | "ageMin"
    | "ageMax"
  >,
  other: Pick<
    MeetProfile,
    | "kind"
    | "myGender"
    | "birthYear"
    | "city"
    | "country"
    | "seekGender"
    | "ageMin"
    | "ageMax"
    | "active"
  >
): number {
  if (!other.active) return -1;
  if (me.kind !== other.kind) return -1;

  const otherAge = ageFromBirthYear(other.birthYear);
  const myAge = ageFromBirthYear(me.birthYear);

  if (me.ageMin != null && otherAge != null && otherAge < me.ageMin) return -1;
  if (me.ageMax != null && otherAge != null && otherAge > me.ageMax) return -1;
  if (other.ageMin != null && myAge != null && myAge < other.ageMin) return -1;
  if (other.ageMax != null && myAge != null && myAge > other.ageMax) return -1;

  if (
    me.seekGender !== "UNSPECIFIED" &&
    other.myGender !== "UNSPECIFIED" &&
    me.seekGender !== other.myGender
  ) {
    return -1;
  }
  if (
    other.seekGender !== "UNSPECIFIED" &&
    me.myGender !== "UNSPECIFIED" &&
    other.seekGender !== me.myGender
  ) {
    return -1;
  }

  let score = 10;
  if (me.country && other.country && me.country === other.country) score += 4;
  if (
    me.city &&
    other.city &&
    normalizePlace(me.city) === normalizePlace(other.city)
  ) {
    score += 8;
  }
  if (otherAge != null && me.ageMin != null && me.ageMax != null) {
    const mid = (me.ageMin + me.ageMax) / 2;
    score += Math.max(0, 5 - Math.abs(otherAge - mid) / 3);
  }
  return score;
}

export function toPublicMeetProfile(
  profile: MeetProfile,
  opts: { viewerId: string; matchScore?: number }
): MeetProfilePublic {
  const isOwner = profile.userId === opts.viewerId;
  const showPhoto = isOwner || profile.photoVisible;
  return {
    id: profile.id,
    userId: profile.userId,
    kind: profile.kind,
    headline: profile.headline,
    bio: profile.bio,
    myGender: profile.myGender,
    birthYear: isOwner ? profile.birthYear : null,
    age: ageFromBirthYear(profile.birthYear),
    city: profile.city,
    country: profile.country,
    seekGender: isOwner ? profile.seekGender : "UNSPECIFIED",
    ageMin: isOwner ? profile.ageMin : null,
    ageMax: isOwner ? profile.ageMax : null,
    interests: profile.interests,
    photoUrl: showPhoto ? profile.photoUrl : null,
    photoVisible: profile.photoVisible,
    active: profile.active,
    matchScore: opts.matchScore,
    updatedAt: profile.updatedAt,
    createdAt: profile.createdAt,
  };
}

export function meetKindLabel(kind: MeetKind, locale: "fr" | "en" = "fr") {
  if (locale === "en") {
    return kind === "BUSINESS" ? "Business networking" : "Romance";
  }
  return kind === "BUSINESS" ? "Affaires" : "Amour";
}
