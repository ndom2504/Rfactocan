import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { assertThreadParticipant } from "@/lib/dm";
import { canonicalDmReaction, summarizeReactions } from "@/lib/dm-reactions";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string; messageId: string }> };

const putSchema = z.object({
  emoji: z.string().min(1).max(16).nullable(),
});

async function reactionSummaries(messageId: string, userId: string) {
  const rows = await prisma.directMessageReaction.findMany({
    where: { messageId },
    select: { messageId: true, userId: true, emoji: true },
  });
  return summarizeReactions(rows, userId)[messageId] ?? [];
}

export async function PUT(request: Request, { params }: Params) {
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
      select: { id: true },
    });
    if (!message) {
      return NextResponse.json({ error: "Message introuvable" }, { status: 404 });
    }

    const parsed = putSchema.parse(await request.json());
    const emoji = canonicalDmReaction(parsed.emoji);
    if (parsed.emoji && !emoji) {
      return NextResponse.json({ error: "Réaction invalide." }, { status: 400 });
    }
    const existing = await prisma.directMessageReaction.findUnique({
      where: { messageId_userId: { messageId, userId: session.id } },
    });

    if (!emoji || existing?.emoji === emoji) {
      if (existing) {
        await prisma.directMessageReaction.delete({ where: { id: existing.id } });
      }
    } else if (existing) {
      await prisma.directMessageReaction.update({
        where: { id: existing.id },
        data: { emoji },
      });
    } else {
      await prisma.directMessageReaction.create({
        data: { messageId, userId: session.id, emoji },
      });
    }

    return NextResponse.json({
      reactions: await reactionSummaries(messageId, session.id),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Réaction invalide." },
        { status: 400 }
      );
    }
    console.error("[dm] reaction", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
