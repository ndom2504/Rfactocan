import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { assertThreadParticipant, conversationPath, dmChannel, otherUserId, userIsServiceProviderInThread } from "@/lib/dm";
import { isUserOnline } from "@/lib/presence";
import { notifyUser } from "@/lib/notifications";
import { summarizeReactions, type ReactionSummary } from "@/lib/dm-reactions";
import { persistTyping, readPeerTyping } from "@/lib/dm-typing";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const attachmentUrlSchema = z
  .string()
  .max(2000)
  .refine(
    (value) => {
      if (value.startsWith("/api/media") || value.startsWith("/uploads/")) {
        return true;
      }
      try {
        const parsed = new URL(value);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "URL de pièce jointe invalide." }
  );

const postSchema = z
  .object({
    body: z.string().max(4000).optional().nullable(),
    attachmentUrl: attachmentUrlSchema.optional().nullable(),
    contextType: z.enum(["SERVICE", "JOB", "MEET", "IN"]).optional().nullable(),
    contextId: z.string().optional().nullable(),
  })
  .refine(
    (v) => Boolean((v.body && v.body.trim()) || v.attachmentUrl),
    { message: "Message ou pièce jointe requis." }
  );

const peerSelect = {
  id: true,
  displayName: true,
  avatarUrl: true,
  kycStatus: true,
  lastSeenAt: true,
} as const;

export async function GET(_request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const thread = await assertThreadParticipant(id, session.id);
  if (!thread) {
    return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  }

  try {
    await prisma.user.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    });
  } catch {
    /* presence is best-effort */
  }

  await prisma.directMessage.updateMany({
    where: {
      threadId: id,
      senderId: { not: session.id },
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  const recent = await prisma.directMessage.findMany({
    where: { threadId: id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const messages = recent.reverse();

  let reactionByMessage: Record<string, ReactionSummary[]> = {};
  if (messages.length > 0) {
    try {
      const reactionRows = await prisma.directMessageReaction.findMany({
        where: { messageId: { in: messages.map((m) => m.id) } },
        select: { messageId: true, userId: true, emoji: true },
      });
      reactionByMessage = summarizeReactions(reactionRows, session.id);
    } catch (e) {
      console.error("[dm] reactions", e);
    }
  }

  const peerId = otherUserId(thread, session.id);
  const peer = await prisma.user.findUnique({
    where: { id: peerId },
    select: peerSelect,
  });

  let canInvoice = false;
  try {
    canInvoice = await userIsServiceProviderInThread({
      meId: session.id,
      peerId,
      threadId: id,
      lastContextType: thread.lastContextType,
      lastContextId: thread.lastContextId,
    });
  } catch (e) {
    console.error("[dm] canInvoice", e);
  }

  const peerTyping = await readPeerTyping(id, session.id);

  return NextResponse.json({
    thread: {
      id: thread.id,
      channel: thread.channel,
      lastContextType: thread.lastContextType,
      lastContextId: thread.lastContextId,
    },
    messages: messages.map((m) => ({
      ...m,
      reactions: reactionByMessage[m.id] ?? [],
    })),
    canInvoice,
    peerTyping,
    peer: peer
      ? {
          ...peer,
          online: isUserOnline(peer.lastSeenAt),
        }
      : null,
  });
}

export async function POST(request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const thread = await assertThreadParticipant(id, session.id);
    if (!thread) {
      return NextResponse.json(
        { error: "Conversation introuvable" },
        { status: 404 }
      );
    }

    const body = postSchema.parse(await request.json());
    const text = (body.body || "").trim();
    const message = await prisma.directMessage.create({
      data: {
        threadId: id,
        senderId: session.id,
        body: text || (body.attachmentUrl ? "Pièce jointe" : ""),
        attachmentUrl: body.attachmentUrl || null,
        contextType: body.contextType ?? thread.lastContextType,
        contextId: body.contextId ?? thread.lastContextId,
      },
    });
    void persistTyping(id, session.id, false);

    const sameChannel =
      !body.contextType ||
      dmChannel(body.contextType) === (thread.channel || dmChannel(thread.lastContextType));

    await prisma.directThread.update({
      where: { id },
      data: {
        lastMessageAt: message.createdAt,
        ...(body.contextType && sameChannel
          ? { lastContextType: body.contextType }
          : {}),
        ...(body.contextId && sameChannel
          ? { lastContextId: body.contextId }
          : {}),
      },
    });

    const peerId = otherUserId(thread, session.id);
    const me = await prisma.user.findUnique({
      where: { id: session.id },
      select: { displayName: true },
    });
    await notifyUser({
      userId: peerId,
      type: "DIRECT_MESSAGE",
      title: `Message de ${me?.displayName || "Un membre"}`,
      body: (text || "Pièce jointe").slice(0, 120),
      href: conversationPath(id, thread.channel),
    });

    return NextResponse.json({ message }, { status: 201 });
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
