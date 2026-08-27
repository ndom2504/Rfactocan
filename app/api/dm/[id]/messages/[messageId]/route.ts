import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { assertThreadParticipant, isDmPlaceholderBody } from "@/lib/dm";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string; messageId: string }> };

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
