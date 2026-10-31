import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import {
  MEMBER_STATUS_TTL_MS,
  isAllowedMediaUrl,
  isMemberStatusKind,
  memberStatusCommunityKind,
  memberStatusTitle,
} from "@/lib/member-status";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const postSchema = z.object({
  kind: z
    .enum(["STORY", "IDEA", "HELP", "PROGRESS", "AVAILABLE"])
    .default("STORY"),
  caption: z.string().trim().max(280).optional(),
  mediaUrl: z.string().trim().max(2000).optional().nullable(),
  mediaType: z.enum(["image", "video"]).optional().nullable(),
  mirrorCommunity: z.boolean().optional(),
});

function serialize(
  row: {
    id: string;
    userId: string;
    kind: string;
    caption: string | null;
    mediaUrl: string | null;
    mirrored: boolean;
    expiresAt: Date;
    createdAt: Date;
    user?: {
      id: string;
      displayName: string;
      avatarUrl: string | null;
    };
  },
  meId?: string
) {
  return {
    id: row.id,
    userId: row.userId,
    kind: row.kind,
    caption: row.caption,
    mediaUrl: row.mediaUrl,
    mirrored: row.mirrored,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    mine: meId ? row.userId === meId : false,
    author: row.user
      ? {
          id: row.user.id,
          displayName: row.user.displayName,
          avatarUrl: row.user.avatarUrl,
        }
      : undefined,
  };
}

async function contactUserIds(sessionId: string): Promise<Set<string>> {
  const ids = new Set<string>([sessionId]);
  try {
    const [links, threads] = await Promise.all([
      prisma.userConnection.findMany({
        where: {
          OR: [{ followerId: sessionId }, { followingId: sessionId }],
        },
        select: { followerId: true, followingId: true },
      }),
      prisma.directThread.findMany({
        where: {
          OR: [{ userLowId: sessionId }, { userHighId: sessionId }],
        },
        select: { userLowId: true, userHighId: true },
        take: 200,
      }),
    ]);
    for (const l of links) {
      ids.add(l.followerId === sessionId ? l.followingId : l.followerId);
    }
    for (const t of threads) {
      ids.add(t.userLowId === sessionId ? t.userHighId : t.userLowId);
    }
  } catch (error) {
    console.error("[member-status] contacts", error);
  }
  return ids;
}

/** GET — my status + connected contacts' active 24h statuses. */
export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const now = new Date();
  try {
    await prisma.memberStatus.deleteMany({
      where: { expiresAt: { lt: now } },
    });

    const contactIds = await contactUserIds(session.id);
    const rows = await prisma.memberStatus.findMany({
      where: {
        expiresAt: { gt: now },
        userId: { in: [...contactIds] },
      },
      include: {
        user: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    });

    const mine = rows.find((r) => r.userId === session.id) ?? null;
    return NextResponse.json({
      statuses: rows.map((r) => serialize(r, session.id)),
      mine: mine ? serialize(mine, session.id) : null,
    });
  } catch (error) {
    console.error("[member-status] GET", error);
    return NextResponse.json(
      {
        error: "Statuts indisponibles (table manquante ?)",
        statuses: [],
        mine: null,
      },
      { status: 200 }
    );
  }
}

/** POST — publish / replace my 24h status (photo or short video). */
export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = postSchema.parse(await request.json());
    const kind = isMemberStatusKind(body.kind) ? body.kind : "STORY";
    const caption = (body.caption || "").trim() || null;
    const mediaUrlRaw = (body.mediaUrl || "").trim();
    const mediaUrl = mediaUrlRaw
      ? isAllowedMediaUrl(mediaUrlRaw)
        ? mediaUrlRaw
        : null
      : null;
    if (mediaUrlRaw && !mediaUrl) {
      return NextResponse.json(
        { error: "URL média invalide" },
        { status: 400 }
      );
    }

    const expiresAt = new Date(Date.now() + MEMBER_STATUS_TTL_MS);
    const wantMirror =
      body.mirrorCommunity !== false &&
      memberStatusCommunityKind(kind) !== null;

    const existing = await prisma.memberStatus.findUnique({
      where: { userId: session.id },
    });
    if (existing?.mirrored) {
      try {
        await prisma.communityPost.updateMany({
          where: { sourceKey: `member-status:${existing.id}` },
          data: { status: "REMOVED" },
        });
      } catch {
        /* community table optional */
      }
    }

    const row = await prisma.memberStatus.upsert({
      where: { userId: session.id },
      create: {
        userId: session.id,
        kind,
        caption,
        mediaUrl,
        expiresAt,
        mirrored: false,
      },
      update: {
        kind,
        caption,
        mediaUrl,
        expiresAt,
        mirrored: false,
      },
      include: {
        user: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
    });

    let mirrored = false;
    const communityKind = memberStatusCommunityKind(kind);
    if (wantMirror && communityKind) {
      try {
        const bodyText =
          caption ||
          `${session.displayName} a publié un statut`;
        const isVideo =
          body.mediaType === "video" ||
          /\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(mediaUrl || "");
        await prisma.communityPost.upsert({
          where: { sourceKey: `member-status:${row.id}` },
          create: {
            authorId: session.id,
            kind: communityKind,
            title: memberStatusTitle(kind),
            body: bodyText,
            sourceKey: `member-status:${row.id}`,
            status: "OPEN",
            attachmentsJson: mediaUrl
              ? JSON.stringify([
                  {
                    url: mediaUrl,
                    name: isVideo ? "status.mp4" : "status.jpg",
                    contentType: isVideo ? "video/mp4" : "image/jpeg",
                  },
                ])
              : "[]",
          },
          update: {
            kind: communityKind,
            title: memberStatusTitle(kind),
            body: bodyText,
            status: "OPEN",
            attachmentsJson: mediaUrl
              ? JSON.stringify([
                  {
                    url: mediaUrl,
                    name: isVideo ? "status.mp4" : "status.jpg",
                    contentType: isVideo ? "video/mp4" : "image/jpeg",
                  },
                ])
              : "[]",
          },
        });
        mirrored = true;
        await prisma.memberStatus.update({
          where: { id: row.id },
          data: { mirrored: true },
        });
      } catch (mirrorError) {
        console.error("[member-status] mirror community", mirrorError);
      }
    }

    return NextResponse.json(
      {
        status: serialize(
          { ...row, mirrored },
          session.id
        ),
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Données invalides" },
        { status: 400 }
      );
    }
    console.error("[member-status] POST", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Publication impossible",
      },
      { status: 500 }
    );
  }
}

/** DELETE — clear my status. */
export async function DELETE() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const existing = await prisma.memberStatus.findUnique({
      where: { userId: session.id },
    });
    if (existing) {
      if (existing.mirrored) {
        try {
          await prisma.communityPost.updateMany({
            where: { sourceKey: `member-status:${existing.id}` },
            data: { status: "REMOVED" },
          });
        } catch {
          /* ignore */
        }
      }
      await prisma.memberStatus.delete({ where: { id: existing.id } });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[member-status] DELETE", error);
    return NextResponse.json({ error: "Suppression impossible" }, { status: 500 });
  }
}
