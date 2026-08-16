import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { parseAttachmentsJson } from "@/lib/community";
import { listingFromFeedId } from "@/lib/community-listing-thread";
import {
  communitySourceKey,
  parseCommunityFeedId,
} from "@/lib/community-source";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  feedId: z.string().trim().min(3).max(80),
});

const authorSelect = {
  id: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  country: true,
  kycStatus: true,
  ratingAvg: true,
  ratingCount: true,
} as const;

function serializeEnsured(post: {
  id: string;
  kind: string;
  title: string | null;
  body: string;
  attachmentsJson: string;
  createdAt: Date;
  viewCount: number;
  authorId: string;
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
}, sessionId: string) {
  return {
    id: post.id,
    kind: post.kind,
    title: post.title,
    body: post.body,
    attachments: parseAttachmentsJson(post.attachmentsJson),
    createdAt: post.createdAt,
    href: `/community/${post.id}`,
    source: "post" as const,
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
    isOwner: post.authorId === sessionId,
    viewCount: post.viewCount,
    commentCount: post._count?.comments ?? 0,
  };
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
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const feed = parseCommunityFeedId(parsed.data.feedId);
  if (!feed) {
    return NextResponse.json({ error: "Publication introuvable" }, { status: 400 });
  }

  const sourceKey = communitySourceKey(feed.source, feed.sourceId);
  const existing = await prisma.communityPost.findUnique({
    where: { sourceKey },
    include: {
      author: { select: authorSelect },
      _count: { select: { comments: true } },
    },
  });
  if (existing && existing.status === "OPEN") {
    return NextResponse.json({ post: serializeEnsured(existing, session.id) });
  }

  const listing = await listingFromFeedId(feed);
  if (!listing) {
    return NextResponse.json({ error: "Annonce introuvable" }, { status: 404 });
  }

  const created = await prisma.communityPost.upsert({
    where: { sourceKey },
    create: {
      authorId: listing.authorId,
      kind: listing.kind,
      title: listing.title.slice(0, 120),
      body: listing.body.trim().slice(0, 4000) || listing.title,
      attachmentsJson: JSON.stringify(listing.attachments),
      status: "OPEN",
      sourceKey,
    },
    update: { status: "OPEN" },
    include: {
      author: { select: authorSelect },
      _count: { select: { comments: true } },
    },
  });

  return NextResponse.json({ post: serializeEnsured(created, session.id) });
}
