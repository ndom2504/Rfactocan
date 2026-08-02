import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { parseAttachmentsJson } from "@/lib/community";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = (searchParams.get("status") ?? "").trim().toUpperCase();
  const take = Math.min(Math.max(Number(searchParams.get("limit") ?? 40) || 40, 1), 100);

  try {
    const posts = await prisma.communityPost.findMany({
      where: {
        ...(status === "OPEN" || status === "HIDDEN" || status === "REMOVED"
          ? { status: status as "OPEN" | "HIDDEN" | "REMOVED" }
          : {}),
      },
      include: {
        author: {
          select: { id: true, displayName: true, email: true },
        },
        _count: { select: { comments: true, reports: true } },
      },
      orderBy: { createdAt: "desc" },
      take,
    });

    return NextResponse.json({
      posts: posts.map((p) => ({
        id: p.id,
        kind: p.kind,
        title: p.title,
        body: p.body.slice(0, 280),
        status: p.status,
        createdAt: p.createdAt,
        viewCount: p.viewCount,
        commentCount: p._count.comments,
        reportCount: p._count.reports,
        attachments: parseAttachmentsJson(p.attachmentsJson),
        author: p.author,
      })),
    });
  } catch (error) {
    console.error("Admin community posts failed:", error);
    return NextResponse.json(
      { error: "Publications indisponibles (table manquante ?)", posts: [] },
      { status: 200 }
    );
  }
}

export async function PATCH(request: Request) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const body = z
    .object({
      postId: z.string().min(1),
      status: z.enum(["OPEN", "HIDDEN", "REMOVED"]),
    })
    .parse(await request.json());

  const post = await prisma.communityPost.update({
    where: { id: body.postId },
    data: { status: body.status },
    select: { id: true, status: true },
  });

  return NextResponse.json({ post });
}
