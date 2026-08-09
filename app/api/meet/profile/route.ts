import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { toPublicMeetProfile } from "@/lib/meet";
import { prisma } from "@/lib/prisma";

const mediaUrl = z
  .string()
  .max(2000)
  .refine(
    (v) =>
      v.startsWith("/uploads/") ||
      v.startsWith("/api/media?") ||
      v.startsWith("https://") ||
      v.startsWith("http://"),
    "URL de photo invalide"
  );

const schema = z.object({
  kind: z.enum(["BUSINESS", "ROMANCE"]),
  headline: z.string().trim().min(3).max(120),
  bio: z.string().trim().max(800).optional().nullable(),
  myGender: z.enum(["MALE", "FEMALE", "OTHER", "UNSPECIFIED"]).optional(),
  birthYear: z
    .number()
    .int()
    .min(1920)
    .max(new Date().getFullYear() - 16)
    .optional()
    .nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  country: z.string().trim().max(80).optional().nullable(),
  seekGender: z.enum(["MALE", "FEMALE", "OTHER", "UNSPECIFIED"]).optional(),
  ageMin: z.number().int().min(18).max(99).optional().nullable(),
  ageMax: z.number().int().min(18).max(99).optional().nullable(),
  interests: z.string().trim().max(300).optional().nullable(),
  photoUrl: mediaUrl.optional().nullable(),
  photoVisible: z.boolean().optional(),
  active: z.boolean().optional(),
});

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const profile = await prisma.meetProfile.findUnique({
      where: { userId: session.id },
    });
    if (!profile) {
      return NextResponse.json({ profile: null });
    }
    return NextResponse.json({
      profile: toPublicMeetProfile(profile, { viewerId: session.id }),
    });
  } catch (error) {
    console.error("MeetProfile GET failed:", error);
    return NextResponse.json(
      {
        error:
          "Profil rencontre indisponible. Exécutez prisma/neon-meet-profiles.sql si besoin.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (session.status === "SUSPENDED") {
    return NextResponse.json({ error: "Compte suspendu" }, { status: 403 });
  }

  try {
    const body = schema.parse(await request.json());
    if (
      body.ageMin != null &&
      body.ageMax != null &&
      body.ageMin > body.ageMax
    ) {
      return NextResponse.json(
        { error: "L’âge minimum doit être ≤ à l’âge maximum." },
        { status: 400 }
      );
    }

    const data = {
      kind: body.kind,
      headline: body.headline.trim(),
      bio: body.bio?.trim() || null,
      myGender: body.myGender ?? "UNSPECIFIED",
      birthYear: body.birthYear ?? null,
      city: body.city?.trim() || null,
      country: body.country?.trim() || null,
      seekGender: body.seekGender ?? "UNSPECIFIED",
      ageMin: body.ageMin ?? null,
      ageMax: body.ageMax ?? null,
      interests: body.interests?.trim() || null,
      photoUrl: body.photoUrl === undefined ? undefined : body.photoUrl,
      photoVisible: body.photoVisible ?? true,
      active: body.active ?? true,
    };

    const profile = await prisma.meetProfile.upsert({
      where: { userId: session.id },
      create: {
        userId: session.id,
        kind: data.kind,
        headline: data.headline,
        bio: data.bio,
        myGender: data.myGender,
        birthYear: data.birthYear,
        city: data.city,
        country: data.country,
        seekGender: data.seekGender,
        ageMin: data.ageMin,
        ageMax: data.ageMax,
        interests: data.interests,
        photoUrl: data.photoUrl ?? null,
        photoVisible: data.photoVisible,
        active: data.active,
      },
      update: {
        kind: data.kind,
        headline: data.headline,
        bio: data.bio,
        myGender: data.myGender,
        birthYear: data.birthYear,
        city: data.city,
        country: data.country,
        seekGender: data.seekGender,
        ageMin: data.ageMin,
        ageMax: data.ageMax,
        interests: data.interests,
        ...(data.photoUrl !== undefined ? { photoUrl: data.photoUrl } : {}),
        photoVisible: data.photoVisible,
        active: data.active,
      },
    });

    return NextResponse.json({
      profile: toPublicMeetProfile(profile, { viewerId: session.id }),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Données invalides" },
        { status: 400 }
      );
    }
    console.error("MeetProfile PUT failed:", error);
    return NextResponse.json(
      {
        error:
          "Enregistrement impossible. Vérifiez la table MeetProfile (prisma/neon-meet-profiles.sql).",
      },
      { status: 500 }
    );
  }
}
