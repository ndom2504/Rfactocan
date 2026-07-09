import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          ratingAvg: true,
          ratingCount: true,
          verifiedAt: true,
          avatarUrl: true,
          bio: true,
        },
      },
    },
  });
  if (!trip) {
    return NextResponse.json({ error: "Voyage introuvable" }, { status: 404 });
  }
  return NextResponse.json({ trip });
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const { id } = await params;
  const trip = await prisma.trip.findUnique({ where: { id } });
  if (!trip) {
    return NextResponse.json({ error: "Voyage introuvable" }, { status: 404 });
  }
  if (trip.userId !== session.id && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }
  await prisma.trip.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
  return NextResponse.json({ ok: true });
}
