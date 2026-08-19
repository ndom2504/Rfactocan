import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import {
  COMMUNITY_MAX_ATTACHMENTS,
  COMMUNITY_POST_KINDS,
  isAllowedCommunityContentType,
  parseAttachmentsJson,
  type CommunityAttachment,
} from "@/lib/community";
import { loadAuthorConnections } from "@/lib/connections";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const kindSchema = z.enum(["BUSINESS", "OPPORTUNITY", "COMMUNITY"]);
const attachmentSchema = z.object({
  url: z.string().min(1).max(800),
  name: z.string().min(1).max(180),
  contentType: z.string().min(3).max(120),
  size: z.number().int().nonnegative().max(100 * 1024 * 1024),
});

const patchSchema = z.object({
  kind: kindSchema.optional(),
  title: z.string().trim().max(120).nullable().optional(),
  body: z.string().trim().min(10).max(4000).optional(),
  attachments: z.array(attachmentSchema).max(COMMUNITY_MAX_ATTACHMENTS).optional(),
  /** Admin-only status change */
  status: z.enum(["OPEN", "HIDDEN", "REMOVED"]).optional(),
});

async function serializeOpenPost(id: string, sessionId: string, isAdmin: boolean) {
  const post = await prisma.communityPost.findFirst({
    where: { id, ...(isAdmin ? {} : { status: "OPEN" }) },
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
  if (!post) return null;
  const connMap = await loadAuthorConnections(sessionId, [post.author.id]);
  const stats = connMap.get(post.author.id) ?? {
    connectionCount: 0,
    connectedByMe: false,
  };
  return {
    id: post.id,
    kind: post.kind,
    title: post.title,
    body: post.body,
    attachments: parseAttachmentsJson(post.attachmentsJson),
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    status: post.status,
    href: `/community/${post.id}`,
    source: "post" as const,
    viewCount: post.viewCount,
    commentCount: post._count.comments,
    isOwner: post.authorId === sessionId || isAdmin,
    author: {
      id: post.author.id,
      displayName: post.author.displayName,
      avatarUrl: post.author.avatarUrl,
      bio: post.author.bio,
      country: post.author.country,
      verified: post.author.kycStatus === "VERIFIED",
      ratingAvg: post.author.ratingAvg,
      ratingCount: post.author.ratingCount,
      connectionCount: stats.connectionCount,
      connectedByMe: stats.connectedByMe,
    },
  };
}

export async function GET(_request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const post = await prisma.communityPost.findFirst({
    where: { id, status: "OPEN" },
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

  if (!post) {
    return NextResponse.json({ error: "Publication introuvable" }, { status: 404 });
  }

  const updated = await prisma.communityPost.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
    select: { viewCount: true },
  });

  const serialized = await serializeOpenPost(id, session.id, session.role === "ADMIN");
  if (!serialized) {
    return NextResponse.json({ error: "Publication introuvable" }, { status: 404 });
  }
  return NextResponse.json({
    post: { ...serialized, viewCount: updated.viewCount },
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (session.status === "SUSPENDED") {
    return NextResponse.json({ error: "Compte suspendu" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.communityPost.findUnique({ where: { id } });
  if (!existing || existing.status === "REMOVED") {
    return NextResponse.json({ error: "Publication introuvable" }, { status: 404 });
  }

  const isAdmin = session.role === "ADMIN";
  const isOwner = existing.authorId === session.id;
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (parsed.data.status !== undefined && !isAdmin) {
    return NextResponse.json(
      { error: "Seul un admin peut changer le statut." },
      { status: 403 }
    );
  }

  if (
    parsed.data.kind &&
    !(COMMUNITY_POST_KINDS as readonly string[]).includes(parsed.data.kind)
  ) {
    return NextResponse.json({ error: "Type invalide" }, { status: 400 });
  }

  const attachments: CommunityAttachment[] | undefined = parsed.data.attachments;
  if (attachments) {
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
  }

  await prisma.communityPost.update({
    where: { id },
    data: {
      ...(parsed.data.kind ? { kind: parsed.data.kind } : {}),
      ...(parsed.data.title !== undefined
        ? { title: parsed.data.title?.trim() || null }
        : {}),
      ...(parsed.data.body ? { body: parsed.data.body.trim() } : {}),
      ...(attachments
        ? { attachmentsJson: JSON.stringify(attachments) }
        : {}),
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
    },
  });

  const post = await serializeOpenPost(id, session.id, isAdmin);
  return NextResponse.json({ post });
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const post = await prisma.communityPost.findUnique({ where: { id } });
  if (!post || post.status === "REMOVED") {
    return NextResponse.json({ error: "Publication introuvable" }, { status: 404 });
  }
  if (post.authorId !== session.id && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  await prisma.communityPost.update({
    where: { id },
    data: { status: "REMOVED" },
  });

  return NextResponse.json({ ok: true });
}
