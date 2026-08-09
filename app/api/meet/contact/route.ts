import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { getOrCreateDirectThread } from "@/lib/dm";
import { notifyUser } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

const sendSchema = z.object({
  toUserId: z.string().min(1),
  message: z.string().trim().min(2).max(500).optional(),
});

async function openMeetThread(fromUserId: string, toUserId: string, message: string) {
  const thread = await getOrCreateDirectThread({
    meId: fromUserId,
    peerId: toUserId,
    contextType: "MEET",
  });
  await prisma.directMessage.create({
    data: {
      threadId: thread.id,
      senderId: fromUserId,
      body: message,
      contextType: "MEET",
    },
  });
  await prisma.directThread.update({
    where: { id: thread.id },
    data: { lastMessageAt: new Date() },
  });
  return thread;
}

/**
 * Demande de contact rencontre privée.
 * Si l’autre a déjà demandé → ACCEPTED mutuel + ouverture du fil DM.
 * Sinon PENDING (pas de messagerie tant que non mutuel / pas d’acceptation).
 */
export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = sendSchema.parse(await request.json());
    if (body.toUserId === session.id) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas vous contacter vous-même." },
        { status: 400 }
      );
    }

    const [myProfile, theirProfile] = await Promise.all([
      prisma.meetProfile.findUnique({ where: { userId: session.id } }),
      prisma.meetProfile.findUnique({
        where: { userId: body.toUserId },
        include: { user: { select: { displayName: true, status: true } } },
      }),
    ]);

    if (!myProfile?.active) {
      return NextResponse.json(
        {
          error:
            "Créez et activez votre profil Rencontre privée pour contacter d’autres membres.",
        },
        { status: 403 }
      );
    }
    if (!theirProfile?.active || theirProfile.user.status === "SUSPENDED") {
      return NextResponse.json(
        { error: "Ce profil n’est plus disponible." },
        { status: 404 }
      );
    }
    if (myProfile.kind !== theirProfile.kind) {
      return NextResponse.json(
        {
          error:
            "Contact possible uniquement entre profils du même type (affaires ou amour).",
        },
        { status: 400 }
      );
    }

    const message =
      body.message?.trim() ||
      `Bonjour, votre profil « ${theirProfile.headline} » m’intéresse. Pouvons-nous échanger ?`;

    const reverse = await prisma.meetContact.findUnique({
      where: {
        fromUserId_toUserId: {
          fromUserId: body.toUserId,
          toUserId: session.id,
        },
      },
    });

    if (reverse && reverse.status === "ACCEPTED") {
      const thread = await openMeetThread(session.id, body.toUserId, message);
      return NextResponse.json({
        contact: reverse,
        mutual: true,
        threadId: thread.id,
      });
    }

    if (reverse && reverse.status === "PENDING") {
      const updated = await prisma.meetContact.update({
        where: { id: reverse.id },
        data: { status: "ACCEPTED" },
      });
      await prisma.meetContact.upsert({
        where: {
          fromUserId_toUserId: {
            fromUserId: session.id,
            toUserId: body.toUserId,
          },
        },
        create: {
          fromUserId: session.id,
          toUserId: body.toUserId,
          message,
          status: "ACCEPTED",
        },
        update: { message, status: "ACCEPTED" },
      });

      const thread = await openMeetThread(session.id, body.toUserId, message);
      const me = await prisma.user.findUnique({
        where: { id: session.id },
        select: { displayName: true },
      });
      await notifyUser({
        userId: body.toUserId,
        type: "MEET_CONTACT_MUTUAL",
        title: "Contact rencontre accepté",
        body: `${me?.displayName || "Un membre"} a accepté l’échange. La messagerie est ouverte.`,
        href: `/messages/dm/${thread.id}`,
      });

      return NextResponse.json(
        { contact: updated, mutual: true, threadId: thread.id },
        { status: 200 }
      );
    }

    const existing = await prisma.meetContact.findUnique({
      where: {
        fromUserId_toUserId: {
          fromUserId: session.id,
          toUserId: body.toUserId,
        },
      },
    });
    if (existing?.status === "ACCEPTED") {
      const thread = await getOrCreateDirectThread({
        meId: session.id,
        peerId: body.toUserId,
        contextType: "MEET",
      });
      return NextResponse.json({
        contact: existing,
        mutual: true,
        threadId: thread.id,
      });
    }
    if (existing?.status === "PENDING") {
      return NextResponse.json({
        contact: existing,
        mutual: false,
        message: "Demande déjà envoyée.",
      });
    }

    const contact = await prisma.meetContact.create({
      data: {
        fromUserId: session.id,
        toUserId: body.toUserId,
        message,
        status: "PENDING",
      },
    });

    const me = await prisma.user.findUnique({
      where: { id: session.id },
      select: { displayName: true },
    });
    await notifyUser({
      userId: body.toUserId,
      type: "MEET_CONTACT",
      title: "Demande de contact (rencontre privée)",
      body: `${me?.displayName || "Un membre"} souhaite entrer en contact avec vous.`,
      href: `/meet/${session.id}`,
    });

    return NextResponse.json(
      { contact, mutual: false, threadId: null },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message },
        { status: 400 }
      );
    }
    console.error("Meet contact POST failed:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/** Liste demandes reçues / envoyées. */
export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const [incoming, outgoing] = await Promise.all([
      prisma.meetContact.findMany({
        where: { toUserId: session.id, status: { in: ["PENDING", "ACCEPTED"] } },
        include: {
          fromUser: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              meetProfile: {
                select: {
                  headline: true,
                  kind: true,
                  photoUrl: true,
                  photoVisible: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 40,
      }),
      prisma.meetContact.findMany({
        where: {
          fromUserId: session.id,
          status: { in: ["PENDING", "ACCEPTED"] },
        },
        include: {
          toUser: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              meetProfile: {
                select: {
                  headline: true,
                  kind: true,
                  photoUrl: true,
                  photoVisible: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 40,
      }),
    ]);

    return NextResponse.json({ incoming, outgoing });
  } catch (error) {
    console.error("Meet contact GET failed:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
