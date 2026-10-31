import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import {
  MEMBER_STATUS_MAX_PER_USER,
  MEMBER_STATUS_TTL_MS,
  isAllowedMediaUrl,
  isMemberStatusKind,
  memberStatusCommunityKind,
  memberStatusTitle,
} from "@/lib/member-status";
import { notifyUser } from "@/lib/notifications";
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

type StatusRow = {
  id: string;
  userId: string;
  kind: string;
  caption: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  viewCount: number;
  mirrored: boolean;
  expiresAt: Date;
  createdAt: Date;
  user?: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
};

function serializeItem(row: StatusRow, meId?: string) {
  return {
    id: row.id,
    userId: row.userId,
    kind: row.kind,
    caption: row.caption,
    mediaUrl: row.mediaUrl,
    mediaType: row.mediaType,
    viewCount: row.viewCount ?? 0,
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

function groupByUser(rows: StatusRow[], meId: string) {
  const map = new Map<
    string,
    {
      userId: string;
      author?: StatusRow["user"];
      items: ReturnType<typeof serializeItem>[];
    }
  >();

  // Oldest first within a user so the first published is "featured"
  const chronological = [...rows].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );

  for (const row of chronological) {
    let g = map.get(row.userId);
    if (!g) {
      g = { userId: row.userId, author: row.user, items: [] };
      map.set(row.userId, g);
    }
    g.items.push(serializeItem(row, meId));
  }

  const groups = [...map.values()].map((g) => {
    const featured = g.items[0] ?? null;
    const viewCount = g.items.reduce((sum, it) => sum + (it.viewCount || 0), 0);
    return {
      userId: g.userId,
      author: featured?.author ?? (g.author
        ? {
            id: g.author.id,
            displayName: g.author.displayName,
            avatarUrl: g.author.avatarUrl,
          }
        : undefined),
      mine: g.userId === meId,
      count: g.items.length,
      viewCount,
      featured,
      items: g.items,
    };
  });

  // Most recent activity first among groups
  groups.sort((a, b) => {
    const aT = a.items[a.items.length - 1]?.createdAt
      ? new Date(a.items[a.items.length - 1]!.createdAt as string | Date).getTime()
      : 0;
    const bT = b.items[b.items.length - 1]?.createdAt
      ? new Date(b.items[b.items.length - 1]!.createdAt as string | Date).getTime()
      : 0;
    return bT - aT;
  });

  return groups;
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

async function notifyConnectedAboutStory(
  authorId: string,
  authorName: string,
  storyId: string
) {
  try {
    const links = await prisma.userConnection.findMany({
      where: {
        OR: [{ followerId: authorId }, { followingId: authorId }],
      },
      select: { followerId: true, followingId: true },
      take: 200,
    });
    const recipients = new Set<string>();
    for (const l of links) {
      const other = l.followerId === authorId ? l.followingId : l.followerId;
      if (other !== authorId) recipients.add(other);
    }
    const title = "Nouvelle story";
    const body = `${authorName} a publié une story`;
    const href = "/messages";
    await Promise.all(
      [...recipients].map((userId) =>
        notifyUser({
          userId,
          type: "story",
          title,
          body,
          href,
          data: { storyId, authorId },
        })
      )
    );
  } catch (error) {
    console.error("[member-status] notify", error);
  }
}

/** GET — story groups for me + connected contacts (max 10 items / user). */
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
    const rows = (await prisma.memberStatus.findMany({
      where: {
        expiresAt: { gt: now },
        userId: { in: [...contactIds] },
      },
      include: {
        user: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    })) as StatusRow[];

    const groups = groupByUser(rows, session.id);
    const mineGroup = groups.find((g) => g.mine) ?? null;
    // Backward-compatible flat list = featured of each group
    const statuses = groups
      .filter((g) => !g.mine)
      .map((g) => g.featured!)
      .filter(Boolean);

    return NextResponse.json({
      groups,
      statuses,
      mine: mineGroup?.featured ?? null,
      mineGroup,
      maxPerUser: MEMBER_STATUS_MAX_PER_USER,
    });
  } catch (error) {
    console.error("[member-status] GET", error);
    return NextResponse.json(
      {
        error: "Stories indisponibles (table manquante ?)",
        groups: [],
        statuses: [],
        mine: null,
        mineGroup: null,
        maxPerUser: MEMBER_STATUS_MAX_PER_USER,
      },
      { status: 200 }
    );
  }
}

/** POST — add a story (up to 10 active). Does not replace existing ones. */
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
    if (!mediaUrl) {
      return NextResponse.json(
        { error: "Photo ou vidéo requise pour une story" },
        { status: 400 }
      );
    }

    const now = new Date();
    await prisma.memberStatus.deleteMany({
      where: { userId: session.id, expiresAt: { lt: now } },
    });

    const activeCount = await prisma.memberStatus.count({
      where: { userId: session.id, expiresAt: { gt: now } },
    });
    if (activeCount >= MEMBER_STATUS_MAX_PER_USER) {
      return NextResponse.json(
        {
          error: `Maximum ${MEMBER_STATUS_MAX_PER_USER} stories actives. Supprimez-en une pour en ajouter.`,
        },
        { status: 400 }
      );
    }

    const isVideo =
      body.mediaType === "video" ||
      /\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(mediaUrl);
    const mediaType = isVideo ? "video" : "image";
    const expiresAt = new Date(Date.now() + MEMBER_STATUS_TTL_MS);
    const wantMirror =
      body.mirrorCommunity === true &&
      memberStatusCommunityKind(kind) !== null;

    const row = (await prisma.memberStatus.create({
      data: {
        userId: session.id,
        kind,
        caption,
        mediaUrl,
        mediaType,
        viewCount: 0,
        expiresAt,
        mirrored: false,
      },
      include: {
        user: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
    })) as StatusRow;

    let mirrored = false;
    const communityKind = memberStatusCommunityKind(kind);
    if (wantMirror && communityKind) {
      try {
        const bodyText =
          caption || `${session.displayName} a publié une story`;
        await prisma.communityPost.create({
          data: {
            authorId: session.id,
            kind: communityKind,
            title: memberStatusTitle(kind),
            body: bodyText,
            sourceKey: `member-status:${row.id}`,
            status: "OPEN",
            attachmentsJson: JSON.stringify([
              {
                url: mediaUrl,
                name: isVideo ? "story.mp4" : "story.jpg",
                contentType: isVideo ? "video/mp4" : "image/jpeg",
              },
            ]),
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

    void notifyConnectedAboutStory(
      session.id,
      session.displayName || "Un membre",
      row.id
    );

    return NextResponse.json(
      {
        status: serializeItem({ ...row, mirrored, mediaType }, session.id),
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

/** DELETE — ?id= clears one story; without id clears all mine. */
export async function DELETE(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const id = new URL(request.url).searchParams.get("id")?.trim() || null;
    const existing = id
      ? await prisma.memberStatus.findFirst({
          where: { id, userId: session.id },
        })
      : null;

    if (id && !existing) {
      return NextResponse.json({ error: "Story introuvable" }, { status: 404 });
    }

    const toRemove = id
      ? [existing!]
      : await prisma.memberStatus.findMany({
          where: { userId: session.id },
        });

    for (const row of toRemove) {
      if (row.mirrored) {
        try {
          await prisma.communityPost.updateMany({
            where: { sourceKey: `member-status:${row.id}` },
            data: { status: "REMOVED" },
          });
        } catch {
          /* ignore */
        }
      }
      await prisma.memberStatus.delete({ where: { id: row.id } });
    }
    return NextResponse.json({ ok: true, deleted: toRemove.length });
  } catch (error) {
    console.error("[member-status] DELETE", error);
    return NextResponse.json({ error: "Suppression impossible" }, { status: 500 });
  }
}
