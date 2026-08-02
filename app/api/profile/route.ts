import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
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
    "URL de média invalide"
  );

const schema = z.object({
  displayName: z.string().min(2).max(80).optional(),
  bio: z.string().max(500).optional(),
  country: z.string().max(80).optional(),
  avatarUrl: mediaUrl.optional().nullable(),
  bannerUrl: mediaUrl.optional().nullable(),
  role: z.enum(["SENDER", "TRAVELER", "BOTH"]).optional(),
  language: z.enum(["fr", "en"]).optional(),
  preferredCurrency: z.enum(["CAD", "USD", "EUR", "XOF", "XAF"]).optional(),
  acceptPublicationCharter: z.boolean().optional(),
});

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    include: {
      _count: { select: { referrals: true } },
    },
  });
  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }
  // Never expose the raw private blob URL in JSON; use /api/kyc/manual-id to stream.
  const { manualIdDocUrl, ...safe } = user;
  return NextResponse.json({
    user: {
      ...safe,
      hasManualIdDoc: Boolean(manualIdDocUrl),
    },
  });
}

export async function PATCH(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = schema.parse(await request.json());
    const { acceptPublicationCharter, ...rest } = body;
    const data: Record<string, unknown> = { ...rest };
    if (acceptPublicationCharter === true) {
      data.publicationCharterAcceptedAt = new Date();
    }
    const user = await prisma.user.update({
      where: { id: session.id },
      data,
    });
    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
