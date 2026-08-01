import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  userId: z.string().min(1).max(64),
});

async function connectionCount(userId: string) {
  return prisma.userConnection.count({ where: { followingId: userId } });
}

/** POST — connect (follow). Body: { userId } */
export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const { userId } = parsed.data;
  if (userId === session.id) {
    return NextResponse.json(
      { error: "Impossible de se connecter à soi-même" },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  try {
    await prisma.userConnection.upsert({
      where: {
        followerId_followingId: {
          followerId: session.id,
          followingId: userId,
        },
      },
      create: { followerId: session.id, followingId: userId },
      update: {},
    });
  } catch (error) {
    console.error("UserConnection create failed:", error);
    return NextResponse.json(
      { error: "Connexion indisponible (table manquante ?)" },
      { status: 503 }
    );
  }

  const count = await connectionCount(userId);
  return NextResponse.json({ connected: true, connectionCount: count });
}

/** DELETE — disconnect (unfollow). Query: ?userId= */
export async function DELETE(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = new URL(request.url).searchParams.get("userId")?.trim() ?? "";
  if (!userId) {
    return NextResponse.json({ error: "userId requis" }, { status: 400 });
  }

  try {
    await prisma.userConnection.deleteMany({
      where: { followerId: session.id, followingId: userId },
    });
  } catch (error) {
    console.error("UserConnection delete failed:", error);
    return NextResponse.json(
      { error: "Connexion indisponible (table manquante ?)" },
      { status: 503 }
    );
  }

  const count = await connectionCount(userId);
  return NextResponse.json({ connected: false, connectionCount: count });
}
