import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  ageFromBirthYear,
  scoreMeetMatch,
  toPublicMeetProfile,
} from "@/lib/meet";
import { prisma } from "@/lib/prisma";

/**
 * Recherche tableaux de bord — profils rencontre privée actifs.
 * Nécessite un profil rencontre actif pour le matching (même type).
 * Résultats → /meet/[userId]
 */
export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const country = (searchParams.get("country") || "").trim().toUpperCase();
  const city = (searchParams.get("city") || "").trim().toLowerCase();
  const kindRaw = (searchParams.get("kind") || "").trim().toUpperCase();
  const kind =
    kindRaw === "BUSINESS" || kindRaw === "ROMANCE" ? kindRaw : null;

  try {
    const myMeet = await prisma.meetProfile.findUnique({
      where: { userId: session.id },
    });

    if (!myMeet?.active) {
      return NextResponse.json({
        profiles: [],
        needProfile: true,
        message:
          "Créez et activez votre profil de rencontre privée pour voir les correspondances.",
      });
    }

    const targetKind = kind && kind === myMeet.kind ? kind : myMeet.kind;

    const candidates = await prisma.meetProfile.findMany({
      where: {
        active: true,
        kind: targetKind,
        userId: { not: session.id },
        user: { status: { not: "SUSPENDED" } },
        ...(country ? { country: { equals: country, mode: "insensitive" } } : {}),
        ...(city
          ? { city: { contains: city, mode: "insensitive" } }
          : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            bio: true,
            country: true,
            kycStatus: true,
            ratingAvg: true,
            ratingCount: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    let scored = candidates
      .map((p) => ({
        profile: p,
        score: scoreMeetMatch(myMeet, p),
      }))
      .filter((x) => x.score >= 0);

    if (q) {
      scored = scored.filter(({ profile: p }) => {
        const hay = [
          p.headline,
          p.bio,
          p.interests,
          p.city,
          p.country,
          p.user.displayName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }

    scored.sort((a, b) => b.score - a.score);
    const slice = scored.slice(0, 40);

    const profiles = slice.map(({ profile: p, score }) => {
      const pub = toPublicMeetProfile(p, {
        viewerId: session.id,
        matchScore: score,
      });
      const age = ageFromBirthYear(p.birthYear);
      return {
        userId: p.userId,
        profileId: p.id,
        kind: p.kind,
        headline: pub.headline,
        bio: pub.bio,
        interests: pub.interests,
        city: pub.city,
        country: pub.country,
        age,
        photoUrl: pub.photoVisible ? pub.photoUrl : null,
        photoVisible: pub.photoVisible,
        matchScore: score,
        href: `/meet/${p.userId}`,
        user: {
          id: p.user.id,
          displayName: p.user.displayName,
          avatarUrl: p.user.avatarUrl,
          country: p.user.country,
          kycStatus: p.user.kycStatus,
          ratingAvg: p.user.ratingAvg,
          ratingCount: p.user.ratingCount,
        },
      };
    });

    return NextResponse.json({
      profiles,
      needProfile: false,
      myKind: myMeet.kind,
    });
  } catch (error) {
    console.error("Meet search failed:", error);
    return NextResponse.json(
      {
        error:
          "Recherche rencontre indisponible. Vérifiez que les tables MeetProfile existent (SQL Neon).",
      },
      { status: 503 }
    );
  }
}
