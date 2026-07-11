import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isUserOnline } from "@/lib/presence";
import { prisma } from "@/lib/prisma";

/** Heartbeat: mark current user as online. */
export async function POST() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const lastSeenAt = new Date();
  await prisma.user.update({
    where: { id: session.id },
    data: { lastSeenAt },
  });

  return NextResponse.json({ ok: true, lastSeenAt });
}

/** Lookup another user's presence. */
export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = new URL(request.url).searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId requis" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, lastSeenAt: true, displayName: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  return NextResponse.json({
    userId: user.id,
    lastSeenAt: user.lastSeenAt,
    online: isUserOnline(user.lastSeenAt),
  });
}
