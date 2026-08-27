import { NextResponse } from "next/server";
import { z } from "zod";
import type { CommunityPostKind } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import {
  attachmentFromImageUrl,
  COMMUNITY_MAX_ATTACHMENTS,
  isAllowedCommunityContentType,
  parseAttachmentsJson,
  type CommunityAttachment,
} from "@/lib/community";
import { loadAuthorConnections } from "@/lib/connections";
import { prisma } from "@/lib/prisma";
import {
  communitySourceKey,
  parseCommunityFeedId,
} from "@/lib/community-source";

const kindSchema = z.enum(["BUSINESS", "OPPORTUNITY", "COMMUNITY"]);

const attachmentSchema = z.object({
  url: z.string().min(1).max(800),
  name: z.string().min(1).max(180),
  contentType: z.string().min(3).max(120),
  size: z.number().int().nonnegative().max(100 * 1024 * 1024),
});

const createSchema = z.object({
  kind: kindSchema,
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().min(10).max(4000),
  attachments: z.array(attachmentSchema).max(COMMUNITY_MAX_ATTACHMENTS).optional(),
});

type FeedAuthor = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  country: string | null;
  verified: boolean;
  ratingAvg: number;
  ratingCount: number;
  connectionCount: number;
  connectedByMe: boolean;
};

type FeedItem = {
  id: string;
  kind: string;
  title: string | null;
  body: string;
  attachments: CommunityAttachment[];
  createdAt: Date | string;
  updatedAt?: Date | string;
  href: string | null;
  source: "post" | "service" | "shop" | "trip" | "parcel" | "job" | "meet";
  author: FeedAuthor;
  isOwner: boolean;
  viewCount: number;
  commentCount: number;
};

function serializePost(post: {
  id: string;
  kind: string;
  title: string | null;
  body: string;
  attachmentsJson: string;
  createdAt: Date;
  updatedAt: Date;
  authorId: string;
  viewCount?: number;
  _count?: { comments?: number };
  author: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    bio: string | null;
    country: string | null;
    kycStatus: string;
    ratingAvg: number;
    ratingCount: number;
  };
}): FeedItem {
  return {
    id: post.id,
    kind: post.kind,
    title: post.title,
    body: post.body,
    attachments: parseAttachmentsJson(post.attachmentsJson),
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    href: `/community/${post.id}`,
    source: "post",
    author: {
      id: post.author.id,
      displayName: post.author.displayName,
      avatarUrl: post.author.avatarUrl,
      bio: post.author.bio,
      country: post.author.country,
      verified: post.author.kycStatus === "VERIFIED",
      ratingAvg: post.author.ratingAvg,
      ratingCount: post.author.ratingCount,
      connectionCount: 0,
      connectedByMe: false,
    },
    isOwner: false,
    viewCount: post.viewCount ?? 0,
    commentCount: post._count?.comments ?? 0,
  };
}

function toFeedAuthor(
  user: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    bio: string | null;
    country: string | null;
    kycStatus: string;
    ratingAvg: number;
    ratingCount: number;
  },
  country?: string | null
): FeedAuthor {
  return {
    id: user.id,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    country: user.country ?? country ?? null,
    verified: user.kycStatus === "VERIFIED",
    ratingAvg: user.ratingAvg,
    ratingCount: user.ratingCount,
    connectionCount: 0,
    connectedByMe: false,
  };
}

const AUTHOR_SELECT = {
  id: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  country: true,
  kycStatus: true,
  ratingAvg: true,
  ratingCount: true,
} as const;

function matchesKindFilter(kind: string, filter: string) {
  if (!filter) return true;
  return kind === filter;
}

export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const kind = (searchParams.get("kind") ?? "").trim().toUpperCase();
  const take = Math.min(
    Math.max(Number(searchParams.get("limit") ?? 40) || 40, 1),
    80
  );

  const feed: FeedItem[] = [];

  try {
  const wantAnnounce = !kind || kind === "ANNOUNCE";
  const wantTrip = matchesKindFilter("TRIP", kind);
  const wantParcel = matchesKindFilter("PARCEL", kind);
  const wantService = matchesKindFilter("SERVICE", kind);

  if (wantAnnounce) {
    try {
      const posts = await prisma.communityPost.findMany({
        where: { status: "OPEN", sourceKey: null },
        include: {
          author: { select: AUTHOR_SELECT },
          _count: { select: { comments: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 40,
      });
      for (const p of posts) {
        feed.push({
          ...serializePost(p),
          isOwner: p.authorId === session.id || session.role === "ADMIN",
        });
      }
    } catch (error) {
      console.error("CommunityPost query failed:", error);
    }
  }

  const [trips, parcels, services] = await Promise.all([
    wantTrip
      ? prisma.trip.findMany({
          where: { status: "OPEN" },
          include: { user: { select: AUTHOR_SELECT } },
          orderBy: { createdAt: "desc" },
          take: 40,
        })
      : Promise.resolve([]),
    wantParcel
      ? prisma.parcelRequest.findMany({
          where: { status: "OPEN", needType: "PARCEL" },
          include: { user: { select: AUTHOR_SELECT } },
          orderBy: { createdAt: "desc" },
          take: 40,
        })
      : Promise.resolve([]),
    wantService
      ? prisma.serviceListing.findMany({
          where: { status: "OPEN" },
          include: { user: { select: AUTHOR_SELECT } },
          orderBy: { createdAt: "desc" },
          take: 40,
        })
      : Promise.resolve([]),
  ]);

  for (const trip of trips) {
    const author = trip.user;
    feed.push({
      id: `trip:${trip.id}`,
      kind: "TRIP",
      title: `${trip.fromCity} → ${trip.toCity}`,
      body: [
        trip.weightKg != null ? `Capacité ${trip.weightKg} kg` : null,
        trip.departAt
          ? `Départ ${new Date(trip.departAt).toLocaleDateString("fr-CA")}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ") || "Voyage publié sur Rfacto",
      attachments: [],
      createdAt: trip.createdAt,
      href: `/trips/${trip.id}`,
      source: "trip",
      author: toFeedAuthor(author, trip.fromCountry),
      isOwner: author.id === session.id,
      viewCount: 0,
      commentCount: 0,
    });
  }

  for (const req of parcels) {
    const author = req.user;
    let cover: string | null = null;
    try {
      const photos = JSON.parse(req.photosJson || "[]") as unknown;
      if (Array.isArray(photos) && typeof photos[0] === "string") {
        cover = photos[0];
      }
    } catch {
      /* ignore */
    }
    const attachment = attachmentFromImageUrl(cover, `${req.fromCity}-${req.toCity}`);
    feed.push({
      id: `parcel:${req.id}`,
      kind: "PARCEL",
      title: `${req.fromCity} → ${req.toCity}`,
      body: [
        req.weightKg ? `${req.weightKg} kg` : null,
        req.description?.slice(0, 280) || null,
      ]
        .filter(Boolean)
        .join(" · ") || "Besoin d’expédition",
      attachments: attachment ? [attachment] : [],
      createdAt: req.createdAt,
      href: `/requests/${req.id}`,
      source: "parcel",
      author: toFeedAuthor(author, req.fromCountry),
      isOwner: author.id === session.id,
      viewCount: 0,
      commentCount: 0,
    });
  }

  for (const s of services) {
    const author = s.user;
    let cover: string | null = null;
    try {
      const photos = JSON.parse(s.photosJson || "[]") as unknown;
      if (Array.isArray(photos) && typeof photos[0] === "string") {
        cover = photos[0];
      }
    } catch {
      /* ignore */
    }
    const attachment = attachmentFromImageUrl(cover, s.title);
    feed.push({
      id: `svc:${s.id}`,
      kind: "SERVICE",
      title: s.title,
      body: s.description,
      attachments: attachment ? [attachment] : [],
      createdAt: s.createdAt,
      href: `/services/listing/${s.id}`,
      source: "service",
      author: toFeedAuthor(author, s.country),
      isOwner: author.id === session.id,
      viewCount: 0,
      commentCount: 0,
    });
  }

  feed.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const slice = feed.slice(0, take);
  const connMap = await loadAuthorConnections(
    session.id,
    slice.map((p) => p.author.id)
  );
  for (const item of slice) {
    const stats = connMap.get(item.author.id);
    if (stats) {
      item.author.connectionCount = stats.connectionCount;
      item.author.connectedByMe = stats.connectedByMe;
    }
  }

  const listingKeys = slice
    .map((p) => parseCommunityFeedId(p.id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => communitySourceKey(p.source, p.sourceId));
  if (listingKeys.length > 0) {
    try {
      const threads = await prisma.communityPost.findMany({
        where: { sourceKey: { in: listingKeys }, status: "OPEN" },
        select: {
          sourceKey: true,
          _count: { select: { comments: true } },
        },
      });
      const countByKey = new Map(
        threads.map((t) => [t.sourceKey, t._count.comments])
      );
      for (const item of slice) {
        const parsed = parseCommunityFeedId(item.id);
        if (!parsed) continue;
        item.commentCount =
          countByKey.get(communitySourceKey(parsed.source, parsed.sourceId)) ?? 0;
      }
    } catch (error) {
      console.error("Community listing comment counts skipped:", error);
    }
  }

  return NextResponse.json({
    posts: slice,
  });
  } catch (error) {
    console.error("[community feed]", error);
    return NextResponse.json(
      { error: "Impossible de charger la communauté", posts: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (session.status === "SUSPENDED") {
    return NextResponse.json({ error: "Compte suspendu" }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const attachments: CommunityAttachment[] = parsed.data.attachments ?? [];
  for (const a of attachments) {
    if (!isAllowedCommunityContentType(a.contentType)) {
      return NextResponse.json(
        {
          error:
            "Pièce jointe non autorisée (images, vidéos mp4/webm/mov ou PDF uniquement).",
        },
        { status: 400 }
      );
    }
  }

  const kind = parsed.data.kind as CommunityPostKind;

  try {
    const post = await prisma.communityPost.create({
      data: {
        authorId: session.id,
        kind,
        title: parsed.data.title?.trim() || null,
        body: parsed.data.body.trim(),
        attachmentsJson: JSON.stringify(attachments),
        status: "OPEN",
      },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            bio: true,
            country: true,
            kycStatus: true,
            ratingAvg: true,
            ratingCount: true,
          },
        },
        _count: { select: { comments: true } },
      },
    });

    return NextResponse.json(
      {
        post: {
          ...serializePost(post),
          isOwner: true,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CommunityPost create failed:", error);
    return NextResponse.json(
      {
        error:
          "Publication impossible. Vérifiez que la table CommunityPost est créée en production (prisma/neon-community-posts.sql).",
      },
      { status: 500 }
    );
  }
}
