import { NextResponse } from "next/server";
import { z } from "zod";
import type { CommunityPostKind } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import {
  attachmentFromImageUrl,
  COMMUNITY_MAX_ATTACHMENTS,
  COMMUNITY_MAX_VIDEO_BYTES,
  isAllowedCommunityContentType,
  parseAttachmentsJson,
  type CommunityAttachment,
} from "@/lib/community";
import { loadAuthorConnections } from "@/lib/connections";
import { sourceUrlFromBody } from "@/lib/community-trends";
import { rankOpportunityPosts } from "@/lib/market-opportunities";
import { prisma } from "@/lib/prisma";
import { toReadableMediaUrl } from "@/lib/storage";
import { publicContactVerified } from "@/lib/kyc-policy";
import {
  ensureMissingMemberCodes,
  shownMemberName,
} from "@/lib/member-code";
import {
  communitySourceKey,
  parseCommunityFeedId,
} from "@/lib/community-source";
import {
  templateFromSourceKey,
  VIRTUAL_POST_TEMPLATES,
} from "@/lib/virtual-community-posts";

const kindSchema = z.enum(["BUSINESS", "OPPORTUNITY", "COMMUNITY"]);

const attachmentSchema = z.object({
  url: z.string().min(1).max(800),
  name: z.string().min(1).max(180),
  contentType: z.string().min(3).max(120),
  size: z.number().int().nonnegative().max(COMMUNITY_MAX_VIDEO_BYTES),
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
  bannerUrl: string | null;
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
  sourceKey?: string | null;
  viewCount?: number;
  _count?: { comments?: number };
  author: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    bannerUrl?: string | null;
    bio: string | null;
    country: string | null;
    kycStatus: string;
    ratingAvg: number;
    ratingCount: number;
    memberCode?: string | null;
    email?: string | null;
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
    href:
      post.sourceKey?.startsWith("trend:") && sourceUrlFromBody(post.body)
        ? sourceUrlFromBody(post.body)
        : `/community/${post.id}`,
    source: "post",
    author: {
      id: post.author.id,
      displayName: shownMemberName(post.author),
      avatarUrl: toReadableMediaUrl(post.author.avatarUrl),
      bannerUrl: toReadableMediaUrl(post.author.bannerUrl ?? null),
      bio: post.author.bio,
      country: post.author.country,
      verified: publicContactVerified(post.author.kycStatus === "VERIFIED"),
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
    bannerUrl?: string | null;
    bio: string | null;
    country: string | null;
    kycStatus: string;
    ratingAvg: number;
    ratingCount: number;
    memberCode?: string | null;
    email?: string | null;
  },
  country?: string | null
): FeedAuthor {
  return {
    id: user.id,
    displayName: shownMemberName(user),
    avatarUrl: toReadableMediaUrl(user.avatarUrl),
    bannerUrl: toReadableMediaUrl(user.bannerUrl ?? null),
    bio: user.bio,
    country: user.country ?? country ?? null,
    verified: publicContactVerified(user.kycStatus === "VERIFIED"),
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
  bannerUrl: true,
  bio: true,
  country: true,
  phone: true,
  email: true,
  memberCode: true,
  kycStatus: true,
  ratingAvg: true,
  ratingCount: true,
} as const;

function marketplaceKind(category: string) {
  if (category === "produit") return "PRODUCT";
  if (category === "don") return "GIFT";
  return "SERVICE";
}

function wantsMarketplace(filter: string, itemKind: string) {
  if (!filter || filter === "ALL") return true;
  return filter === itemKind;
}

function contactLine(
  name: string,
  phone: string | null | undefined,
  city: string | null | undefined
) {
  const who = [name, phone?.trim()].filter(Boolean).join(" · ");
  const place = city?.trim();
  return ["Contact : " + who, place].filter(Boolean).join(" · ");
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
  const [services, shopProducts, virtualPosts, trendPosts, opportunityPosts, newsPosts] =
    await Promise.all([
    prisma.serviceListing.findMany({
      where: { status: "OPEN" },
      include: { user: { select: AUTHOR_SELECT } },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    prisma.shopProduct.findMany({
      where: { active: true, shop: { status: "OPEN" } },
      include: {
        shop: { include: { user: { select: AUTHOR_SELECT } } },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.communityPost.findMany({
      where: { status: "OPEN", sourceKey: { startsWith: "virtual:" } },
      include: {
        author: { select: AUTHOR_SELECT },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 24,
    }),
    prisma.communityPost.findMany({
      where: { status: "OPEN", sourceKey: { startsWith: "trend:" } },
      include: {
        author: { select: AUTHOR_SELECT },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.communityPost.findMany({
      where: { status: "OPEN", sourceKey: { startsWith: "opportunity:" } },
      include: {
        author: { select: AUTHOR_SELECT },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.communityPost.findMany({
      where: { status: "OPEN", sourceKey: { startsWith: "news:" } },
      include: {
        author: { select: AUTHOR_SELECT },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  for (const s of services) {
    const itemKind = marketplaceKind(s.category);
    if (!wantsMarketplace(kind, itemKind)) continue;
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
    const priceLabel =
      itemKind === "GIFT"
        ? "Gratuit"
        : !s.priceAmount
          ? "Prix à discuter"
          : `${s.priceAmount} ${s.currency}`;
    feed.push({
      id: `svc:${s.id}`,
      kind: itemKind,
      title: s.title,
      body: [priceLabel, s.description, contactLine(author.displayName, author.phone, s.city)]
        .filter(Boolean)
        .join("\n"),
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

  for (const product of shopProducts) {
    if (!wantsMarketplace(kind, "PRODUCT")) continue;
    const author = product.shop.user;
    let photos: string[] = [];
    try {
      const parsed = JSON.parse(product.photosJson || "[]") as unknown;
      if (Array.isArray(parsed)) {
        photos = parsed.filter((p): p is string => typeof p === "string");
      }
    } catch {
      photos = [];
    }
    const cover = product.photoUrl || photos[0] || null;
    const attachment = attachmentFromImageUrl(cover, product.title);
    const major = (product.priceCents / 100).toFixed(2);
    feed.push({
      id: `shop-product:${product.id}`,
      kind: "PRODUCT",
      title: product.title,
      body: [
        `${major} ${product.shop.currency}`,
        product.description,
        contactLine(author.displayName, author.phone, product.shop.city),
      ]
        .filter(Boolean)
        .join("\n"),
      attachments: attachment ? [attachment] : [],
      createdAt: product.createdAt,
      href: `/shops/${product.shop.id}`,
      source: "shop",
      author: toFeedAuthor(author, product.shop.country),
      isOwner: author.id === session.id,
      viewCount: 0,
      commentCount: 0,
    });
  }

  for (const post of virtualPosts) {
    const template = templateFromSourceKey(post.sourceKey);
    if (!template || !wantsMarketplace(kind, template.card)) continue;
    const attachment = attachmentFromImageUrl(template.photoUrl, template.title);
    feed.push({
      id: post.id,
      kind: template.card,
      title: template.title,
      body: [
        template.priceLabel,
        template.body,
        contactLine(post.author.displayName, post.author.phone, template.city),
      ].join("\n"),
      attachments: attachment ? [attachment] : [],
      createdAt: post.createdAt,
      href: `/community/${post.id}`,
      source: "post",
      author: toFeedAuthor(post.author, template.country),
      isOwner: post.authorId === session.id,
      viewCount: post.viewCount ?? 0,
      commentCount: post._count.comments,
    });
  }

  if (virtualPosts.length === 0) {
    for (const template of VIRTUAL_POST_TEMPLATES) {
      if (!wantsMarketplace(kind, template.card)) continue;
      const attachment = attachmentFromImageUrl(template.photoUrl, template.title);
      feed.push({
        id: `showcase:${template.id}`,
        kind: template.card,
        title: template.title,
        body: [
          template.priceLabel,
          template.body,
          contactLine("Inspiration Rfacto", null, template.city),
        ].join("\n"),
        attachments: attachment ? [attachment] : [],
        createdAt: new Date().toISOString(),
        href: null,
        source: "post",
        author: {
          id: "inspiration",
          displayName: "Inspiration Rfacto",
          avatarUrl: null,
          bannerUrl: null,
          bio: null,
          country: template.country,
          verified: false,
          ratingAvg: 0,
          ratingCount: 0,
          connectionCount: 0,
          connectedByMe: false,
        },
        isOwner: false,
        viewCount: 0,
        commentCount: 0,
      });
    }
  }

  const headlines: FeedItem[] = [];
  for (const post of trendPosts) {
    const lane = post.sourceKey?.split(":")[1];
    const visible =
      !kind ||
      kind === "ALL" ||
      kind === "COMMUNITY" ||
      (kind === "PRODUCT" && lane === "produit");
    if (!visible) continue;
    const item = serializePost(post);
    item.isOwner = post.authorId === session.id;
    headlines.push(item);
  }
  const rankedOpportunities = wantsMarketplace(kind, "PRODUCT")
    ? rankOpportunityPosts(opportunityPosts)
    : [];
  const extraOpportunities: FeedItem[] = [];
  rankedOpportunities.forEach((post, index) => {
    const item = serializePost(post);
    item.kind = "PRODUCT";
    item.isOwner = post.authorId === session.id;
    if (index < 12) headlines.push(item);
    else extraOpportunities.push(item);
  });
  for (const post of newsPosts) {
    if (!wantsMarketplace(kind, "COMMUNITY")) continue;
    const item = serializePost(post);
    item.isOwner = post.authorId === session.id;
    headlines.push(item);
  }

  feed.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const slice = [...headlines, ...feed].slice(0, take);
  let members: FeedItem[] = [];
  if (wantsMarketplace(kind, "COMMUNITY")) {
    try {
      await ensureMissingMemberCodes();
      const people = await prisma.user.findMany({
        where: {
          status: "ACTIVE",
          memberCode: { not: null },
          NOT: { email: { endsWith: "@rfacto.local", mode: "insensitive" } },
        },
        select: { ...AUTHOR_SELECT, createdAt: true },
        orderBy: { displayName: "asc" },
        take: 400,
      });
      members = people.map((person) => ({
        id: `member:${person.id}`,
        kind: "COMMUNITY",
        title: person.displayName,
        body: [
          `Identifiant : ${person.memberCode}`,
          person.bio?.trim() ? `Slogan\n${person.bio.trim()}` : null,
        ]
          .filter(Boolean)
          .join("\n\n"),
        attachments: [],
        createdAt: person.createdAt,
        href: `/member/${person.id}`,
        source: "post",
        author: toFeedAuthor(person, person.country),
        isOwner: person.id === session.id,
        viewCount: 0,
        commentCount: 0,
      }));
    } catch (error) {
      console.error("Community member directory skipped:", error);
    }
  }
  const visible = [...slice, ...extraOpportunities, ...members];
  const connMap = await loadAuthorConnections(
    session.id,
    visible.map((p) => p.author.id)
  );
  for (const item of visible) {
    const stats = connMap.get(item.author.id);
    if (stats) {
      item.author.connectionCount = stats.connectionCount;
      item.author.connectedByMe = stats.connectedByMe;
    }
  }

  const listingKeys = visible
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
      for (const item of visible) {
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
    posts: visible,
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
          select: AUTHOR_SELECT,
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
