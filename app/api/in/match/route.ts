import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { matchDirectoryUsers, sanitizeMatchPhones } from "@/lib/in-network";
import { isUserOnline } from "@/lib/presence";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, phone: true, status: true },
  });
  if (!me || me.status === "SUSPENDED") {
    return NextResponse.json({ error: "Compte indisponible" }, { status: 403 });
  }
  if (!me.phone) {
    return NextResponse.json(
      { error: "Activez In avec votre numéro.", code: "IN_PHONE_REQUIRED" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const phones = sanitizeMatchPhones(
      body && typeof body === "object" ? (body as { phones?: unknown }).phones : []
    );
    if (phones.length === 0) {
      return NextResponse.json({ matches: [] });
    }

    const users = await prisma.user.findMany({
      where: {
        phone: { not: null },
        id: { not: me.id },
        status: { not: "SUSPENDED" },
      },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        phone: true,
        lastSeenAt: true,
      },
      take: 5000,
    });

    const hits = matchDirectoryUsers(phones, users);
    const peerIds = [...new Set(hits.map((hit) => hit.user.id))];
    const threads =
      peerIds.length === 0
        ? []
        : await prisma.directThread.findMany({
            where: {
              channel: "IN",
              OR: [
                { userLowId: me.id, userHighId: { in: peerIds } },
                { userHighId: me.id, userLowId: { in: peerIds } },
              ],
            },
            select: {
              id: true,
              userLowId: true,
              userHighId: true,
              lastMessageAt: true,
            },
          });

    const threadByPeer = new Map<string, { id: string; lastMessageAt: Date | null }>();
    for (const thread of threads) {
      const peerId = thread.userLowId === me.id ? thread.userHighId : thread.userLowId;
      threadByPeer.set(peerId, { id: thread.id, lastMessageAt: thread.lastMessageAt });
    }

    const matches = hits.map(({ user, phone }) => {
      const thread = threadByPeer.get(user.id);
      return {
        userId: user.id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        phone,
        online: isUserOnline(user.lastSeenAt),
        lastSeenAt: user.lastSeenAt,
        threadId: thread?.id ?? null,
      };
    });

    return NextResponse.json({ matches });
  } catch (error) {
    console.error("[in/match]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
