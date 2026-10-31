import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { assertThreadParticipant, isDmPlaceholderBody } from "@/lib/dm";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string; messageId: string }> };

const patchSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

/** Edit own unread text message (not yet Lu). */
export async function PATCH(request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const { id, messageId } = await params;
    const thread = await assertThreadParticipant(id, session.id);
    if (!thread) {
      return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
    }

    const body = patchSchema.parse(await request.json());
    const message = await prisma.directMessage.findFirst({
      where: { id: messageId, threadId: id },
    });
    if (!message) {
      return NextResponse.json({ error: "Message introuvable" }, { status: 404 });
    }
    if (message.senderId !== session.id) {
      return NextResponse.json(
        { error: "Seul l’auteur peut modifier ce message." },
        { status: 403 }
      );
    }
    if (message.readAt) {
      return NextResponse.json(
        { error: "Message déjà lu — modification impossible." },
        { status: 400 }
      );
    }
    const ctx = (message.contextType || "").toUpperCase();
    if (ctx === "SERVICE" || ctx === "OFFER") {
      return NextResponse.json(
        { error: "Ce message système ne peut pas être modifié." },
        { status: 400 }
      );
    }
    if (
      /\/service-payments\//i.test(message.body) ||
      /\/product-offers\//i.test(message.body)
    ) {
      return NextResponse.json(
        { error: "Ce message système ne peut pas être modifié." },
        { status: 400 }
      );
    }

    const updated = await prisma.directMessage.update({
      where: { id: message.id },
      data: {
        body: body.body,
        editedAt: new Date(),
      },
    });
    return NextResponse.json({ message: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Données invalides" },
        { status: 400 }
      );
    }
    console.error("[dm] edit message", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * Remove a file (or voice note) from a DM. The sender can delete it for
 * everyone. If the bubble was only the file, the message is removed.
 */
export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const { id, messageId } = await params;
    const thread = await assertThreadParticipant(id, session.id);
    if (!thread) {
      return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
    }

    const message = await prisma.directMessage.findFirst({
      where: { id: messageId, threadId: id },
      select: {
        id: true,
        senderId: true,
        body: true,
        attachmentUrl: true,
      },
    });
    if (!message) {
      return NextResponse.json({ error: "Message introuvable" }, { status: 404 });
    }
    if (message.senderId !== session.id) {
      return NextResponse.json(
        { error: "Seul l’auteur peut supprimer ce fichier." },
        { status: 403 }
      );
    }
    if (!message.attachmentUrl) {
      return NextResponse.json(
        { error: "Ce message n’a pas de fichier." },
        { status: 400 }
      );
    }

    if (isDmPlaceholderBody(message.body)) {
      await prisma.directMessage.delete({ where: { id: message.id } });
      const last = await prisma.directMessage.findFirst({
        where: { threadId: id },
        orderBy: { createdAt: "desc" },
        select: {
          createdAt: true,
          contextType: true,
          contextId: true,
        },
      });
      await prisma.directThread.update({
        where: { id },
        data: {
          lastMessageAt: last?.createdAt ?? null,
          lastContextType: last?.contextType ?? null,
          lastContextId: last?.contextId ?? null,
        },
      });
      return NextResponse.json({ ok: true, deletedMessage: true });
    }

    const updated = await prisma.directMessage.update({
      where: { id: message.id },
      data: { attachmentUrl: null },
    });
    return NextResponse.json({
      ok: true,
      deletedMessage: false,
      message: updated,
    });
  } catch (error) {
    console.error("[dm] delete attachment", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
