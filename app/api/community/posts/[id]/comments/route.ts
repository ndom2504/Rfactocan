import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const createSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  parentId: z.string().cuid().optional().nullable(),
});

function serializeComment(c: {
  id: string;
  postId: string;
  parentId: string | null;
  body: string;
  createdAt: Date;
  authorId: string;
  author: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
}) {
  return {
    id: c.id,
    postId: c.postId,
    parentId: c.parentId,
    body: c.body,
    createdAt: c.createdAt,
    author: {
      id: c.author.id,
      displayName: c.author.displayName,
      avatarUrl: c.author.avatarUrl,
    },
    isOwner: false as boolean,
  };
}

export async function GET(_request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id: postId } = await params;
  const post = await prisma.communityPost.findFirst({
    where: { id: postId, status: "OPEN" },
    select: { id: true },
  });
  if (!post) {
    return NextResponse.json({ error: "Publication introuvable" }, { status: 404 });
  }

  const comments = await prisma.communityComment.findMany({
    where: { postId },
    include: {
      author: {
        select: { id: true, displayName: true, avatarUrl: true },
      },
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return NextResponse.json({
    comments: comments.map((c) => ({
      ...serializeComment(c),
      isOwner: c.authorId === session.id || session.role === "ADMIN",
    })),
  });
}

export async function POST(request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (session.status === "SUSPENDED") {
    return NextResponse.json({ error: "Compte suspendu" }, { status: 403 });
  }

  const { id: postId } = await params;
  const post = await prisma.communityPost.findFirst({
    where: { id: postId, status: "OPEN" },
    select: { id: true },
  });
  if (!post) {
    return NextResponse.json({ error: "Publication introuvable" }, { status: 404 });
  }

  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  if (parsed.data.parentId) {
    const parent = await prisma.communityComment.findFirst({
      where: { id: parsed.data.parentId, postId },
    });
    if (!parent) {
      return NextResponse.json({ error: "Commentaire parent introuvable" }, { status: 400 });
    }
    // Only allow one level of replies (reply to top-level, not nested reply-to-reply)
    if (parent.parentId) {
      return NextResponse.json(
        { error: "Répondez au commentaire principal." },
        { status: 400 }
      );
    }
  }

  const comment = await prisma.communityComment.create({
    data: {
      postId,
      authorId: session.id,
      parentId: parsed.data.parentId || null,
      body: parsed.data.body.trim(),
    },
    include: {
      author: {
        select: { id: true, displayName: true, avatarUrl: true },
      },
    },
  });

  return NextResponse.json(
    {
      comment: {
        ...serializeComment(comment),
        isOwner: true,
      },
    },
    { status: 201 }
  );
}
