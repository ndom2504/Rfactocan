import { NextResponse } from "next/server";
import { z } from "zod";
import type { CommunityPostKind } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import {
  COMMUNITY_POST_KINDS,
  attachmentFromImageUrl,
  isAllowedCommunityContentType,
  parseAttachmentsJson,
  type CommunityAttachment,
} from "@/lib/community";
import { loadAuthorConnections } from "@/lib/connections";
import { scoreMeetMatch, toPublicMeetProfile } from "@/lib/meet";
import { prisma } from "@/lib/prisma";

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
  source: "post" | "service" | "shop" | "trip" | "job" | "meet";
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
    // JOB / MEET are feed-only; skip DB posts filter for those chips
    if (kind !== "JOB" && kind !== "MEET") {
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
          _count: { select: { comments: true } },
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
    }
  } catch (error) {
    console.error("CommunityPost query failed (table missing on DB?):", error);
  }

  // Same réseau pro items Android surfaced (services / boutiques / voyages / emplois / rencontre)
  const includeNetwork =
    !kind ||
    kind === "BUSINESS" ||
    kind === "OPPORTUNITY" ||
    kind === "COMMUNITY" ||
    kind === "JOB" ||
    kind === "MEET";

  if (includeNetwork && kind !== "MEET") {
    const [services, shops, trips, jobs] = await Promise.all([
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
      matchesKindFilter("JOB", kind) ||
      matchesKindFilter("OPPORTUNITY", kind) ||
      !kind
        ? prisma.parcelRequest.findMany({
            where: {
              status: "OPEN",
              needType: { in: ["JOB_SEEK", "JOB_OFFER"] },
              userId: { not: session.id },
            },
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
    ]);

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
        kind: "BUSINESS",
        title: s.title,
        body: s.description,
        attachments: attachment ? [attachment] : [],
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
          connectionCount: 0,
          connectedByMe: false,
        },
        isOwner: author.id === session.id,
        viewCount: 0,
        commentCount: 0,
      });
    }

    for (const shop of shops) {
      const author = shop.user;
      feed.push({
        id: `shop:${shop.id}`,
        kind: "BUSINESS",
        title: shop.name,
        body: shop.description?.trim() || shop.name,
        attachments: (() => {
          const cover = attachmentFromImageUrl(
            shop.coverUrl || shop.logoUrl,
            shop.name
          );
          return cover ? [cover] : [];
        })(),
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
          connectionCount: 0,
          connectedByMe: false,
        },
        isOwner: author.id === session.id,
        viewCount: 0,
        commentCount: 0,
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
          connectionCount: 0,
          connectedByMe: false,
        },
        isOwner: author.id === session.id,
        viewCount: 0,
        commentCount: 0,
      });
    }

    for (const job of jobs) {
      const author = job.user;
      const place = [job.toCity, job.toCountry].filter(Boolean).join(", ");
      const roleLabel =
        job.needType === "JOB_OFFER" ? "Offre d'emploi" : "Recherche d'emploi";
      feed.push({
        id: `job:${job.id}`,
        kind: "JOB",
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
        createdAt: job.createdAt,
        href: `/requests/${job.id}`,
        source: "job",
        author: {
          id: author.id,
          displayName: author.displayName,
          avatarUrl: author.avatarUrl,
          bio: author.bio,
          country: author.country ?? job.toCountry,
          verified: author.kycStatus === "VERIFIED",
          ratingAvg: author.ratingAvg,
          ratingCount: author.ratingCount,
          connectionCount: 0,
          connectedByMe: false,
        },
        isOwner: author.id === session.id,
        viewCount: 0,
        commentCount: 0,
      });
    }
  }

  // Rencontre privée : matching selon le profil de l'utilisateur
  if (!kind || kind === "MEET" || kind === "OPPORTUNITY") {
    try {
      const myMeet = await prisma.meetProfile.findUnique({
        where: { userId: session.id },
      });
      if (myMeet?.active) {
        const candidates = await prisma.meetProfile.findMany({
          where: {
            active: true,
            kind: myMeet.kind,
            userId: { not: session.id },
            user: { status: { not: "SUSPENDED" } },
          },
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
          orderBy: { updatedAt: "desc" },
          take: 80,
        });

        const scored = candidates
          .map((p) => ({
            profile: p,
            score: scoreMeetMatch(myMeet, p),
          }))
          .filter((x) => x.score >= 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 40);

        for (const { profile: p, score } of scored) {
          const pub = toPublicMeetProfile(p, {
            viewerId: session.id,
            matchScore: score,
          });
          const place = [pub.city, pub.country].filter(Boolean).join(", ");
          const kindFr =
            p.kind === "BUSINESS" ? "Rencontre affaires" : "Rencontre amour";
          const ageBit = pub.age != null ? `${pub.age} ans` : null;
          feed.push({
            id: `meet:${p.id}`,
            kind: "MEET",
            title: pub.headline,
            body: [kindFr, place || null, ageBit, pub.interests, pub.bio?.slice(0, 220)]
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
            createdAt: p.updatedAt,
            href: `/meet/${p.userId}`,
            source: "meet",
            author: {
              id: p.user.id,
              displayName: p.user.displayName,
              avatarUrl: pub.photoUrl || (pub.photoVisible ? p.user.avatarUrl : null),
              bio: p.user.bio,
              country: p.user.country ?? pub.country,
              verified: p.user.kycStatus === "VERIFIED",
              ratingAvg: p.user.ratingAvg,
              ratingCount: p.user.ratingCount,
              connectionCount: 0,
              connectedByMe: false,
            },
            isOwner: false,
            viewCount: 0,
            commentCount: 0,
          });
        }
      } else if (kind === "MEET") {
        // No matches without profile — leave feed empty for this filter
      }
    } catch (error) {
      console.error("Meet profiles feed inject failed:", error);
    }
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

  return NextResponse.json({
    posts: slice,
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
