import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import {
  getWhatsAppCommunityUrl,
  setWhatsAppCommunityUrl,
} from "@/lib/whatsapp-community";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }
  const url = await getWhatsAppCommunityUrl();
  return NextResponse.json({ url });
}

const putSchema = z.object({
  url: z.string().trim().max(500),
});

export async function PUT(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = putSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  try {
    const url = await setWhatsAppCommunityUrl(parsed.data.url);
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_URL") {
      return NextResponse.json(
        {
          error:
            "Lien invalide. Utilisez une invitation WhatsApp (chat.whatsapp.com).",
        },
        { status: 400 }
      );
    }
    console.error("[admin whatsapp-community]", error);
    return NextResponse.json(
      {
        error:
          "Impossible d’enregistrer. Exécutez prisma/neon-app-settings.sql sur Neon.",
      },
      { status: 500 }
    );
  }
}
