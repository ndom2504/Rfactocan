import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

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
