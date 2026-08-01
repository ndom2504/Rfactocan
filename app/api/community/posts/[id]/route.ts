import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { parseAttachmentsJson } from "@/lib/community";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

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

  // Count a view when opening the post detail
  const updated = await prisma.communityPost.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
    select: { viewCount: true },
  });

  return NextResponse.json({
    post: {
      id: post.id,
      kind: post.kind,
      title: post.title,
      body: post.body,
      attachments: parseAttachmentsJson(post.attachmentsJson),
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      href: `/community/${post.id}`,
      source: "post",
      viewCount: updated.viewCount,
      commentCount: post._count.comments,
      isOwner: post.authorId === session.id || session.role === "ADMIN",
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
    },
  });
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
