import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/** POST — increment story view count (once per call; clients throttle). */
export async function POST(_request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const row = await prisma.memberStatus.findFirst({
      where: { id, expiresAt: { gt: new Date() } },
      select: { id: true, userId: true, viewCount: true },
    });
    if (!row) {
      return NextResponse.json({ error: "Story introuvable" }, { status: 404 });
    }
    // Don't count own views
    if (row.userId === session.id) {
      return NextResponse.json({ viewCount: row.viewCount, counted: false });
    }

    const updated = await prisma.memberStatus.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
      select: { viewCount: true },
    });
    return NextResponse.json({ viewCount: updated.viewCount, counted: true });
  } catch (error) {
    console.error("[member-status] view", error);
    return NextResponse.json({ error: "Impossible d’enregistrer la vue" }, { status: 500 });
  }
}
