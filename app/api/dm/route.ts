import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { callDirection, callDurationMs } from "@/lib/call-rules";
import { expireInactiveCalls } from "@/lib/calls";
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

  await expireInactiveCalls();

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

  const unreadByThread = new Map<string, number>();
  const lastCallByThread = new Map<
    string,
    {
      id: string;
      status: string;
      mediaType: string;
      createdAt: Date;
      direction: "inbound" | "outbound" | null;
      missed: boolean;
      durationMs: number | null;
    }
  >();

  if (threads.length > 0) {
    const threadIds = threads.map((t) => t.id);
    const unreadRows = await prisma.directMessage.groupBy({
      by: ["threadId"],
      where: {
        threadId: { in: threadIds },
        senderId: { not: session.id },
        readAt: null,
      },
      _count: { _all: true },
    });
    for (const row of unreadRows) {
      unreadByThread.set(row.threadId, row._count._all);
    }

    const recentCalls = await prisma.call.findMany({
      where: { threadId: { in: threadIds } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        threadId: true,
        status: true,
        mediaType: true,
        createdAt: true,
        callerId: true,
        calleeId: true,
        answeredAt: true,
        endedAt: true,
      },
    });
    for (const call of recentCalls) {
      if (lastCallByThread.has(call.threadId)) continue;
      lastCallByThread.set(call.threadId, {
        id: call.id,
        status: call.status,
        mediaType: call.mediaType,
        createdAt: call.createdAt,
        direction: callDirection(call, session.id),
        missed: call.status === "MISSED",
        durationMs: callDurationMs(call),
      });
    }
  }

  const items = threads.map((t) => {
    const peer = t.userLowId === session.id ? t.userHigh : t.userLow;
    const last = t.messages[0] ?? null;
    const unreadCount = unreadByThread.get(t.id) ?? 0;
    const lastCall = lastCallByThread.get(t.id) ?? null;
    const lastMessageMs = t.lastMessageAt?.getTime() ?? 0;
    const lastCallMs = lastCall?.createdAt.getTime() ?? 0;
    const activityAt =
      lastCallMs > lastMessageMs
        ? lastCall!.createdAt
        : t.lastMessageAt ?? t.updatedAt;
    return {
      id: t.id,
      kind: "dm" as const,
      channel: t.channel,
      lastContextType: t.lastContextType,
      lastContextId: t.lastContextId,
      lastMessageAt: t.lastMessageAt,
      updatedAt: t.updatedAt,
      activityAt,
      peer,
      lastMessage: last,
      lastCall,
      unreadCount,
    };
  });

  items.sort((a, b) => {
    const ta = a.activityAt ? new Date(a.activityAt).getTime() : 0;
    const tb = b.activityAt ? new Date(b.activityAt).getTime() : 0;
    return tb - ta;
  });

  const unreadTotal = items.reduce((sum, t) => sum + t.unreadCount, 0);
  return NextResponse.json({ threads: items, unreadTotal });
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
