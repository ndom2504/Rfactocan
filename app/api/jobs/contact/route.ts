import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import {
  assertBothVerified,
  getOrCreateDirectThread,
} from "@/lib/dm";
import { isJobNeedType } from "@/lib/jobs-catalog";
import { notifyUser } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  fromRequestId: z.string().min(1),
  toRequestId: z.string().min(1),
  message: z.string().min(2).max(800).optional(),
});

/**
 * Premier contact emploi + ouverture d'un fil DM (utilisateurs vérifiés).
 * Les colis restent sur le chat booking — hors de ce flux.
 */
export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = schema.parse(await request.json());
    if (body.fromRequestId === body.toRequestId) {
      return NextResponse.json(
        { error: "Contact invalide." },
        { status: 400 }
      );
    }

    const [fromReq, toReq] = await Promise.all([
      prisma.parcelRequest.findUnique({ where: { id: body.fromRequestId } }),
      prisma.parcelRequest.findUnique({
        where: { id: body.toRequestId },
        include: {
          user: { select: { id: true, displayName: true } },
        },
      }),
    ]);

    if (!fromReq || !toReq) {
      return NextResponse.json(
        { error: "Annonce introuvable." },
        { status: 404 }
      );
    }
    if (fromReq.userId !== session.id) {
      return NextResponse.json({ error: "Interdit" }, { status: 403 });
    }
    if (fromReq.status !== "OPEN" || toReq.status !== "OPEN") {
      return NextResponse.json(
        { error: "Une des annonces n’est plus ouverte." },
        { status: 400 }
      );
    }
    if (!isJobNeedType(fromReq.needType) || !isJobNeedType(toReq.needType)) {
      return NextResponse.json(
        { error: "Contact réservé aux annonces emploi." },
        { status: 400 }
      );
    }
    if (fromReq.needType === toReq.needType) {
      return NextResponse.json(
        {
          error:
            "Contactez une offre si vous recherchez un emploi, ou un profil candidat si vous recrutez.",
        },
        { status: 400 }
      );
    }
    if (toReq.userId === session.id) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas vous contacter vous-même." },
        { status: 400 }
      );
    }

    const verified = await assertBothVerified(session.id, toReq.userId);
    if (!verified.ok) {
      return NextResponse.json(
        {
          error: verified.error,
          code: "code" in verified ? verified.code : undefined,
        },
        { status: verified.status }
      );
    }

    const defaultFr =
      fromReq.needType === "JOB_SEEK"
        ? `Bonjour, mon profil correspond à « ${toReq.jobTitle || "votre offre"} ». Pouvez-nous échanger ?`
        : `Bonjour, votre profil nous intéresse pour « ${fromReq.jobTitle || "notre poste"} ». Pouvons-nous échanger ?`;

    const message = (body.message || defaultFr).trim();

    const existing = await prisma.jobContact.findUnique({
      where: {
        fromUserId_toRequestId: {
          fromUserId: session.id,
          toRequestId: toReq.id,
        },
      },
    });

    const contact =
      existing ??
      (await prisma.jobContact.create({
        data: {
          fromUserId: session.id,
          toUserId: toReq.userId,
          fromRequestId: fromReq.id,
          toRequestId: toReq.id,
          message,
          status: "SENT",
        },
      }));

    const thread = await getOrCreateDirectThread({
      meId: session.id,
      peerId: toReq.userId,
      contextType: "JOB",
      contextId: toReq.id,
    });

    await prisma.directMessage.create({
      data: {
        threadId: thread.id,
        senderId: session.id,
        body: message,
        contextType: "JOB",
        contextId: toReq.id,
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
      userId: toReq.userId,
      type: "JOB_CONTACT",
      title: "Nouveau contact emploi",
      body: `${me?.displayName || "Un membre"} vous a contacté concernant « ${
        toReq.jobTitle || fromReq.jobTitle || "emploi"
      } ».`,
      href: `/messages/dm/${thread.id}`,
    });

    return NextResponse.json(
      { contact, threadId: thread.id, thread: { id: thread.id } },
      { status: existing ? 200 : 201 }
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

export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const requestId = searchParams.get("requestId");

  const contacts = await prisma.jobContact.findMany({
    where: {
      AND: [
        { OR: [{ fromUserId: session.id }, { toUserId: session.id }] },
        ...(requestId
          ? [
              {
                OR: [
                  { fromRequestId: requestId },
                  { toRequestId: requestId },
                ],
              },
            ]
          : []),
      ],
    },
    include: {
      fromUser: {
        select: { id: true, displayName: true, avatarUrl: true },
      },
      toUser: {
        select: { id: true, displayName: true, avatarUrl: true },
      },
      fromRequest: {
        select: {
          id: true,
          needType: true,
          jobTitle: true,
        },
      },
      toRequest: {
        select: {
          id: true,
          needType: true,
          jobTitle: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  return NextResponse.json({ contacts });
}
