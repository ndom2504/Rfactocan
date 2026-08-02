import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteUserAccount } from "@/lib/account-deletion";
import { clearSessionCookie, getSessionUser } from "@/lib/auth";
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

const deleteSchema = z.object({
  confirm: z.literal("SUPPRIMER"),
});

/** Soft-delete (anonymize + suspend) the authenticated account. */
export async function DELETE(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = deleteSchema.parse(await request.json().catch(() => ({})));
    void body;

    const result = await deleteUserAccount(session.id);
    if (result.error === "NOT_FOUND") {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }
    if (result.error === "ADMIN_FORBIDDEN") {
      return NextResponse.json(
        {
          error:
            "Les comptes administrateur ne peuvent pas être supprimés depuis le profil.",
        },
        { status: 403 }
      );
    }
    if (result.error === "ALREADY_DELETED") {
      await clearSessionCookie();
      return NextResponse.json({ ok: true });
    }
    if (result.error === "ACTIVE_BOOKINGS") {
      return NextResponse.json(
        {
          error:
            "Impossible de supprimer le compte : des réservations ou paiements sont encore en cours. Terminez-les ou contactez le support.",
        },
        { status: 409 }
      );
    }
    if (result.error === "OPEN_DISPUTES") {
      return NextResponse.json(
        {
          error:
            "Impossible de supprimer le compte : un litige est encore ouvert. Contactez le support.",
        },
        { status: 409 }
      );
    }

    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error:
            'Pour confirmer, envoyez { "confirm": "SUPPRIMER" }.',
        },
        { status: 400 }
      );
    }
    console.error("delete account", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
