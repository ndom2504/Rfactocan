import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function normalizeWhatsapp(raw: string) {
  return raw.replace(/[\s().-]/g, "").trim();
}

const applySchema = z.object({
  whatsapp: z
    .string()
    .min(8, "Numéro WhatsApp trop court")
    .max(24, "Numéro WhatsApp trop long")
    .transform(normalizeWhatsapp)
    .refine((v) => /^\+?[0-9]{8,20}$/.test(v), {
      message: "Indiquez un numéro WhatsApp valide (ex. +2416…).",
    }),
});

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      isAmbassador: true,
      agentCode: true,
      ambassadorRequestStatus: true,
      ambassadorWhatsapp: true,
      ambassadorRequestedAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  return NextResponse.json({ request: user });
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = applySchema.parse(await request.json());
    const existing = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        isAmbassador: true,
        ambassadorRequestStatus: true,
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }
    if (existing.isAmbassador) {
      return NextResponse.json(
        { error: "Vous êtes déjà ambassadeur." },
        { status: 400 }
      );
    }
    if (existing.ambassadorRequestStatus === "PENDING") {
      return NextResponse.json(
        { error: "Votre demande est déjà en cours d'examen." },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id: session.id },
      data: {
        ambassadorRequestStatus: "PENDING",
        ambassadorWhatsapp: body.whatsapp,
        ambassadorRequestedAt: new Date(),
      },
      select: {
        isAmbassador: true,
        ambassadorRequestStatus: true,
        ambassadorWhatsapp: true,
        ambassadorRequestedAt: true,
      },
    });

    return NextResponse.json({ request: user }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Données invalides" },
        { status: 400 }
      );
    }
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
