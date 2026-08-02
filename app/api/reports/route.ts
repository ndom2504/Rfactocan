import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z
  .object({
    targetUserId: z.string().min(1).optional(),
    communityPostId: z.string().min(1).optional(),
    reason: z.string().min(5).max(200),
    details: z.string().max(2000).optional(),
  })
  .refine((v) => Boolean(v.targetUserId || v.communityPostId), {
    message: "Cible manquante",
  });

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = schema.parse(await request.json());
    let targetUserId = body.targetUserId ?? "";
    let communityPostId: string | null = body.communityPostId ?? null;

    if (communityPostId) {
      const post = await prisma.communityPost.findFirst({
        where: { id: communityPostId, status: "OPEN" },
        select: { id: true, authorId: true },
      });
      if (!post) {
        return NextResponse.json(
          { error: "Publication introuvable" },
          { status: 404 }
        );
      }
      targetUserId = post.authorId;
      if (post.authorId === session.id) {
        return NextResponse.json(
          { error: "Vous ne pouvez pas signaler votre propre publication." },
          { status: 400 }
        );
      }
    } else if (targetUserId === session.id) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas vous signaler vous-même." },
        { status: 400 }
      );
    }

    const report = await prisma.report.create({
      data: {
        reporterId: session.id,
        targetUserId,
        communityPostId,
        reason: body.reason,
        details: body.details,
      },
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const body = z
    .object({ reportId: z.string(), resolved: z.boolean() })
    .parse(await request.json());

  const report = await prisma.report.update({
    where: { id: body.reportId },
    data: { resolved: body.resolved },
  });

  return NextResponse.json({ report });
}
