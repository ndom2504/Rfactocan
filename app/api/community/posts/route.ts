import { NextResponse } from "next/server";
import { z } from "zod";
import type { CommunityPostKind } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import {
  COMMUNITY_POST_KINDS,
  parseAttachmentsJson,
  type CommunityAttachment,
} from "@/lib/community";
import { prisma } from "@/lib/prisma";

const kindSchema = z.enum(["BUSINESS", "OPPORTUNITY", "COMMUNITY"]);

const attachmentSchema = z.object({
  url: z.string().min(1).max(800),
  name: z.string().min(1).max(180),
  contentType: z.string().min(3).max(120),
  size: z.number().int().nonnegative().max(5 * 1024 * 1024),
});

const createSchema = z.object({
  kind: kindSchema,
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().min(10).max(4000),
  attachments: z.array(attachmentSchema).max(3).optional(),
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
  source: "post" | "service" | "shop" | "trip";
  author: FeedAuthor;
  isOwner: boolean;
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
    href: null,
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
    },
    isOwner: false,
  };
}

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
    const posts = await prisma.communityPost.findMany({
      where: {
        status: "OPEN",
        ...(kind && (COMMUNITY_POST_KINDS as readonly string[]).includes(kind)
          ? { kind: kind as (typeof COMMUNITY_POST_KINDS)[number] }
          : {}),
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
      },
      orderBy: { createdAt: "desc" },
      take,
    });
    for (const p of posts) {
      feed.push({
        ...serializePost(p),
        isOwner: p.authorId === session.id || session.role === "ADMIN",
      });
    }
  } catch (error) {
    console.error("CommunityPost query failed (table missing on DB?):", error);
  }

  // Same réseau pro items Android surfaced (services / boutiques / voyages)
  const includeNetwork =
    !kind ||
    kind === "BUSINESS" ||
    kind === "OPPORTUNITY" ||
    kind === "COMMUNITY";

  if (includeNetwork) {
    const [services, shops, trips] = await Promise.all([
      matchesKindFilter("BUSINESS", kind) || matchesKindFilter("COMMUNITY", kind)
        ? prisma.serviceListing.findMany({
            where: { status: "OPEN" },
            include: {
              user: {
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
            },
            orderBy: { createdAt: "desc" },
            take: 25,
          })
        : Promise.resolve([]),
      matchesKindFilter("BUSINESS", kind)
        ? prisma.shop.findMany({
            where: { status: "OPEN" },
            include: {
              user: {
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
            },
            orderBy: { createdAt: "desc" },
            take: 20,
          })
        : Promise.resolve([]),
      matchesKindFilter("OPPORTUNITY", kind) || matchesKindFilter("COMMUNITY", kind)
        ? prisma.trip.findMany({
            where: { status: "OPEN" },
            include: {
              user: {
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
            },
            orderBy: { createdAt: "desc" },
            take: 20,
          })
        : Promise.resolve([]),
    ]);

    for (const s of services) {
      const author = s.user;
      feed.push({
        id: `svc:${s.id}`,
        kind: "BUSINESS",
        title: s.title,
        body: s.description,
        attachments: [],
        createdAt: s.createdAt,
        href: `/services/listing/${s.id}`,
        source: "service",
        author: {
          id: author.id,
          displayName: author.displayName,
          avatarUrl: author.avatarUrl,
          bio: author.bio,
          country: author.country ?? s.country,
          verified: author.kycStatus === "VERIFIED",
          ratingAvg: author.ratingAvg,
          ratingCount: author.ratingCount,
        },
        isOwner: author.id === session.id,
      });
    }

    for (const shop of shops) {
      const author = shop.user;
      feed.push({
        id: `shop:${shop.id}`,
        kind: "BUSINESS",
        title: shop.name,
        body: shop.description?.trim() || shop.name,
        attachments: shop.logoUrl
          ? [
              {
                url: shop.logoUrl,
                name: shop.name,
                contentType: "image/jpeg",
                size: 0,
              },
            ]
          : [],
        createdAt: shop.createdAt,
        href: `/shops/${shop.id}`,
        source: "shop",
        author: {
          id: author.id,
          displayName: author.displayName,
          avatarUrl: author.avatarUrl ?? shop.logoUrl,
          bio: author.bio,
          country: author.country ?? shop.country,
          verified: author.kycStatus === "VERIFIED",
          ratingAvg: author.ratingAvg,
          ratingCount: author.ratingCount,
        },
        isOwner: author.id === session.id,
      });
    }

    for (const trip of trips) {
      const author = trip.user;
      feed.push({
        id: `trip:${trip.id}`,
        kind: "OPPORTUNITY",
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
        author: {
          id: author.id,
          displayName: author.displayName,
          avatarUrl: author.avatarUrl,
          bio: author.bio,
          country: author.country ?? trip.fromCountry,
          verified: author.kycStatus === "VERIFIED",
          ratingAvg: author.ratingAvg,
          ratingCount: author.ratingCount,
        },
        isOwner: author.id === session.id,
      });
    }
  }

  feed.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return NextResponse.json({
    posts: feed.slice(0, take),
  });
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
    const okType =
      a.contentType === "application/pdf" ||
      a.contentType === "image/jpeg" ||
      a.contentType === "image/png" ||
      a.contentType === "image/webp";
    if (!okType) {
      return NextResponse.json(
        { error: "Pièce jointe non autorisée (images ou PDF uniquement)." },
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
