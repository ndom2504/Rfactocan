import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateDirectThread } from "@/lib/dm";
import { notifyUser } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

const actionSchema = z.object({
  action: z.enum(["accept", "decline", "cancel"]),
  message: z.string().trim().min(2).max(500).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = actionSchema.parse(await request.json());
    const contact = await prisma.meetContact.findUnique({ where: { id } });
    if (!contact) {
      return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
    }

    if (body.action === "cancel") {
      if (contact.fromUserId !== session.id) {
        return NextResponse.json({ error: "Interdit" }, { status: 403 });
      }
      if (contact.status !== "PENDING") {
        return NextResponse.json(
          { error: "Seules les demandes en attente peuvent être annulées." },
          { status: 400 }
        );
      }
      const updated = await prisma.meetContact.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
      return NextResponse.json({ contact: updated });
    }

    if (contact.toUserId !== session.id) {
      return NextResponse.json({ error: "Interdit" }, { status: 403 });
    }
    if (contact.status !== "PENDING") {
      return NextResponse.json(
        { error: "Cette demande n’est plus en attente." },
        { status: 400 }
      );
    }

    if (body.action === "decline") {
      const updated = await prisma.meetContact.update({
        where: { id },
        data: { status: "DECLINED" },
      });
      return NextResponse.json({ contact: updated, threadId: null });
    }

    // accept → mutuel
    const myProfile = await prisma.meetProfile.findUnique({
      where: { userId: session.id },
    });
    if (!myProfile?.active) {
      return NextResponse.json(
        {
          error:
            "Activez votre profil Rencontre privée pour accepter un contact.",
        },
        { status: 403 }
      );
    }

    const message =
      body.message?.trim() ||
      "Bonjour, j’accepte votre demande de contact. Ravi(e) d’échanger.";

    const updated = await prisma.meetContact.update({
      where: { id },
      data: { status: "ACCEPTED" },
    });
    await prisma.meetContact.upsert({
      where: {
        fromUserId_toUserId: {
          fromUserId: session.id,
          toUserId: contact.fromUserId,
        },
      },
      create: {
        fromUserId: session.id,
        toUserId: contact.fromUserId,
        message,
        status: "ACCEPTED",
      },
      update: { status: "ACCEPTED", message },
    });

    const thread = await getOrCreateDirectThread({
      meId: session.id,
      peerId: contact.fromUserId,
      contextType: "MEET",
      contextId: contact.id,
    });
    await prisma.directMessage.create({
      data: {
        threadId: thread.id,
        senderId: session.id,
        body: message,
        contextType: "MEET",
        contextId: contact.id,
      },
    });
    await prisma.directThread.update({
      where: { id: thread.id },
      data: { lastMessageAt: new Date() },
    });

    const me = await prisma.user.findUnique({
      where: { id: session.id },
      select: { displayName: true },
    });
    await notifyUser({
      userId: contact.fromUserId,
      type: "MEET_CONTACT_ACCEPTED",
      title: "Contact rencontre accepté",
      body: `${me?.displayName || "Un membre"} a accepté votre demande.`,
      href: `/messages/dm/${thread.id}`,
    });

    return NextResponse.json({ contact: updated, mutual: true, threadId: thread.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message },
        { status: 400 }
      );
    }
    console.error("Meet contact PATCH failed:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
