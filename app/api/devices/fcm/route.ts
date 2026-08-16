import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const bodySchema = z.object({
  token: z.string().trim().min(20).max(4096),
  platform: z.string().trim().max(20).optional(),
});

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const platform = (parsed.data.platform || "ANDROID").toUpperCase().slice(0, 20);
  const token = parsed.data.token;

  try {
    await prisma.deviceToken.upsert({
      where: { token },
      create: { userId: session.id, token, platform },
      update: { userId: session.id, platform },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[devices/fcm] POST", error);
    return NextResponse.json(
      { error: "Impossible d'enregistrer le jeton" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  try {
    await prisma.deviceToken.deleteMany({
      where: { userId: session.id, token: parsed.data.token },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[devices/fcm] DELETE", error);
    return NextResponse.json(
      { error: "Impossible de retirer le jeton" },
      { status: 500 }
    );
  }
}
