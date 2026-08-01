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
}) {
  return {
    id: post.id,
    kind: post.kind,
    title: post.title,
    body: post.body,
    attachments: parseAttachmentsJson(post.attachmentsJson),
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
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
    isOwner: false as boolean,
  };
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

  return NextResponse.json({
    posts: posts.map((p) => ({
      ...serializePost(p),
      isOwner: p.authorId === session.id || session.role === "ADMIN",
    })),
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
}
