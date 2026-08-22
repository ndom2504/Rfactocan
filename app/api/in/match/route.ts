import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { flattenMatchPhones } from "@/lib/in-network";
import { isUserOnline } from "@/lib/presence";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  phones: z.array(z.string().min(3).max(32)).max(400),
});

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
    const body = schema.parse(await request.json());
    const candidates = flattenMatchPhones(body.phones);
    if (candidates.length === 0) {
      return NextResponse.json({ matches: [] });
    }

    const users = await prisma.user.findMany({
      where: {
        phone: { in: candidates },
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
      take: 200,
    });

    const peerIds = users.map((u) => u.id);
    const threads =
      peerIds.length === 0
        ? []
        : await prisma.directThread.findMany({
            where: {
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

    const matches = users.map((user) => {
      const thread = threadByPeer.get(user.id);
      return {
        userId: user.id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
        online: isUserOnline(user.lastSeenAt),
        lastSeenAt: user.lastSeenAt,
        threadId: thread?.id ?? null,
      };
    });

    return NextResponse.json({ matches });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Liste de numéros invalide." }, { status: 400 });
    }
    console.error("[in/match]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
