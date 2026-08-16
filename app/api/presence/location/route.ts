import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const bodySchema = z.object({
  latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180),
});

/** GPS heartbeat for nearby job / service push alerts. */
export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  try {
    await prisma.user.update({
      where: { id: session.id },
      data: {
        lastLat: parsed.data.latitude,
        lastLng: parsed.data.longitude,
        lastLocationAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[presence/location] POST", error);
    return NextResponse.json(
      { error: "Impossible d'enregistrer la position" },
      { status: 500 }
    );
  }
}
