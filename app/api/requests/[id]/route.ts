import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const parcel = await prisma.parcelRequest.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          ratingAvg: true,
          ratingCount: true,
          verifiedAt: true,
        },
      },
    },
  });

  if (!parcel) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }

  return NextResponse.json({
    request: {
      ...parcel,
      photos: JSON.parse(parcel.photosJson || "[]") as string[],
    },
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const { id } = await params;
  const parcel = await prisma.parcelRequest.findUnique({ where: { id } });
  if (!parcel) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }
  if (parcel.userId !== session.id && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }
  await prisma.parcelRequest.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
  return NextResponse.json({ ok: true });
}
