import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import {
  assertDirectContactAllowed,
  conversationPath,
  getOrCreateDirectThread,
  otherUserId,
  type DmContextType,
} from "@/lib/dm";
import { notifyUser } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

const startSchema = z.object({
  toUserId: z.string().min(1),
  contextType: z.enum(["SERVICE", "JOB", "MEET", "IN"]).optional(),
  contextId: z.string().min(1).optional(),
  body: z.string().min(1).max(4000).optional(),
});

const peerSelect = {
  id: true,
  displayName: true,
  avatarUrl: true,
  kycStatus: true,
  ratingAvg: true,
  ratingCount: true,
} as const;

/** GET — list my direct threads. ?scope=in = communauté In ; sinon messagerie services. */
export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const scope = new URL(request.url).searchParams.get("scope");
  const channel = scope === "in" ? "IN" : "APP";

  const threads = await prisma.directThread.findMany({
    where: {
      channel,
      OR: [{ userLowId: session.id }, { userHighId: session.id }],
    },
    include: {
      userLow: { select: peerSelect },
      userHigh: { select: peerSelect },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          body: true,
          attachmentUrl: true,
          senderId: true,
          createdAt: true,
          contextType: true,
        },
      },
    },
    orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
    take: 50,
  });

  const items = threads.map((t) => {
    const peer = t.userLowId === session.id ? t.userHigh : t.userLow;
    const last = t.messages[0] ?? null;
    return {
      id: t.id,
      kind: "dm" as const,
      channel: t.channel,
      lastContextType: t.lastContextType,
      lastContextId: t.lastContextId,
      lastMessageAt: t.lastMessageAt,
      updatedAt: t.updatedAt,
      peer,
      lastMessage: last,
    };
  });

  return NextResponse.json({ threads: items });
}

/**
 * POST — start / open a direct thread (services / jobs avec KYC).
 * Rencontre privée : uniquement si contact mutuel ACCEPTED (pas de cold DM).
 */
export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = startSchema.parse(await request.json());
    if (body.toUserId === session.id) {
      return NextResponse.json(
        { error: "Impossible de vous écrire à vous-même." },
        { status: 400 }
      );
    }

    const contextType = (body.contextType as DmContextType | undefined) ?? null;
    const contextId = body.contextId ?? null;

    const allowed = await assertDirectContactAllowed(
      session.id,
      body.toUserId,
      contextType,
      contextId
    );
    if (!allowed.ok) {
      return NextResponse.json(
        {
          error: allowed.error,
          code: "code" in allowed ? allowed.code : undefined,
        },
        { status: allowed.status }
      );
    }

    const thread = await getOrCreateDirectThread({
      meId: session.id,
      peerId: body.toUserId,
      contextType,
      contextId,
    });

    let message = null;
    if (body.body?.trim()) {
      message = await prisma.directMessage.create({
        data: {
          threadId: thread.id,
          senderId: session.id,
          body: body.body.trim(),
          contextType,
          contextId,
        },
      });
      await prisma.directThread.update({
        where: { id: thread.id },
        data: { lastMessageAt: message.createdAt },
      });

      const me = await prisma.user.findUnique({
        where: { id: session.id },
        select: { displayName: true },
      });
      await notifyUser({
        userId: body.toUserId,
        type: "DIRECT_MESSAGE",
        title: `Message de ${me?.displayName || session.displayName || "Un membre"}`,
        body: body.body.trim().slice(0, 120),
        href: conversationPath(thread.id, thread.channel),
      });
    }

    const peer = await prisma.user.findUnique({
      where: { id: body.toUserId },
      select: peerSelect,
    });

    return NextResponse.json(
      {
        thread: {
          id: thread.id,
          kind: "dm",
          channel: thread.channel,
          lastContextType: thread.lastContextType,
          lastContextId: thread.lastContextId,
          peer,
          otherUserId: otherUserId(thread, session.id),
        },
        message,
      },
      { status: message ? 201 : 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message },
        { status: 400 }
      );
    }
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
