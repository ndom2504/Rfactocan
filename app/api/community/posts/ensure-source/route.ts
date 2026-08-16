import { NextResponse } from "next/server";
import { z } from "zod";
import type { CommunityPostKind } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import {
  attachmentFromImageUrl,
  parseAttachmentsJson,
  type CommunityAttachment,
} from "@/lib/community";
import {
  communitySourceKey,
  parseCommunityFeedId,
} from "@/lib/community-source";
import { prisma } from "@/lib/prisma";
import { toPublicMeetProfile } from "@/lib/meet";

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

type ListingThread = {
  authorId: string;
  kind: CommunityPostKind;
  title: string;
  body: string;
  attachments: CommunityAttachment[];
};

async function listingFromFeedId(
  source: ReturnType<typeof parseCommunityFeedId>
): Promise<ListingThread | null> {
  if (!source) return null;
  const { source: type, sourceId } = source;

  if (type === "service") {
    const s = await prisma.serviceListing.findFirst({
      where: { id: sourceId, status: "OPEN" },
      select: {
        userId: true,
        title: true,
        description: true,
        photosJson: true,
      },
    });
    if (!s) return null;
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
    return {
      authorId: s.userId,
      kind: "BUSINESS",
      title: s.title,
      body: s.description,
      attachments: attachment ? [attachment] : [],
    };
  }

  if (type === "shop") {
    const shop = await prisma.shop.findFirst({
      where: { id: sourceId, status: "OPEN" },
      select: {
        userId: true,
        name: true,
        description: true,
        coverUrl: true,
        logoUrl: true,
      },
    });
    if (!shop) return null;
    const cover = attachmentFromImageUrl(
      shop.coverUrl || shop.logoUrl,
      shop.name
    );
    return {
      authorId: shop.userId,
      kind: "BUSINESS",
      title: shop.name,
      body: shop.description?.trim() || shop.name,
      attachments: cover ? [cover] : [],
    };
  }

  if (type === "trip") {
    const trip = await prisma.trip.findFirst({
      where: { id: sourceId, status: "OPEN" },
      select: {
        userId: true,
        fromCity: true,
        toCity: true,
        weightKg: true,
        departAt: true,
      },
    });
    if (!trip) return null;
    return {
      authorId: trip.userId,
      kind: "OPPORTUNITY",
      title: `${trip.fromCity} → ${trip.toCity}`,
      body:
        [
          trip.weightKg != null ? `Capacité ${trip.weightKg} kg` : null,
          trip.departAt
            ? `Départ ${new Date(trip.departAt).toLocaleDateString("fr-CA")}`
            : null,
        ]
          .filter(Boolean)
          .join(" · ") || "Voyage publié sur Rfacto",
      attachments: [],
    };
  }

  if (type === "job") {
    const job = await prisma.parcelRequest.findFirst({
      where: { id: sourceId, status: "OPEN" },
      select: {
        userId: true,
        needType: true,
        jobTitle: true,
        jobSector: true,
        toCity: true,
        toCountry: true,
        description: true,
      },
    });
    if (!job) return null;
    const roleLabel =
      job.needType === "JOB_OFFER" ? "Offre d'emploi" : "Recherche d'emploi";
    const place = [job.toCity, job.toCountry].filter(Boolean).join(", ");
    return {
      authorId: job.userId,
      kind: "OPPORTUNITY",
      title: job.jobTitle?.trim() || roleLabel,
      body: [
        roleLabel,
        job.jobSector ? `Secteur : ${job.jobSector}` : null,
        place || null,
        job.description?.slice(0, 280) || null,
      ]
        .filter(Boolean)
        .join(" · "),
      attachments: [],
    };
  }

  const profile = await prisma.meetProfile.findFirst({
    where: { id: sourceId, active: true },
    include: {
      user: { select: { id: true, displayName: true } },
    },
  });
  if (!profile) return null;
  const pub = toPublicMeetProfile(profile, {
    viewerId: profile.userId,
    matchScore: 0,
  });
  const place = [pub.city, pub.country].filter(Boolean).join(", ");
  const kindFr =
    profile.kind === "BUSINESS" ? "Rencontre affaires" : "Rencontre amour";
  return {
    authorId: profile.userId,
    kind: "COMMUNITY",
    title: pub.headline,
    body: [kindFr, place || null, pub.bio?.slice(0, 220)]
      .filter(Boolean)
      .join(" · "),
    attachments:
      pub.photoUrl && pub.photoVisible
        ? [
            {
              url: pub.photoUrl,
              name: "presentation",
              contentType: "image/jpeg",
              size: 0,
            },
          ]
        : [],
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
