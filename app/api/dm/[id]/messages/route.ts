import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { assertThreadParticipant, otherUserId } from "@/lib/dm";
import { isUserOnline } from "@/lib/presence";
import { notifyUser } from "@/lib/notifications";
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
    contextType: z.enum(["SERVICE", "JOB"]).optional().nullable(),
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

  await prisma.directMessage.updateMany({
    where: {
      threadId: id,
      senderId: { not: session.id },
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  const messages = await prisma.directMessage.findMany({
    where: { threadId: id },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  const peerId = otherUserId(thread, session.id);
  const peer = await prisma.user.findUnique({
    where: { id: peerId },
    select: peerSelect,
  });

  return NextResponse.json({
    thread: {
      id: thread.id,
      lastContextType: thread.lastContextType,
      lastContextId: thread.lastContextId,
    },
    messages,
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

    await prisma.directThread.update({
      where: { id },
      data: {
        lastMessageAt: message.createdAt,
        ...(body.contextType
          ? { lastContextType: body.contextType }
          : {}),
        ...(body.contextId
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
      href: `/messages/dm/${id}`,
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
