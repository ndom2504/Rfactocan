import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseProductsJson } from "@/lib/services-catalog";

type Ctx = { params: Promise<{ id: string }> };

function serialize(listing: {
  photosJson: string;
  productsJson?: string;
  [key: string]: unknown;
}) {
  return {
    ...listing,
    photos: JSON.parse(listing.photosJson || "[]") as string[],
    products: parseProductsJson(listing.productsJson),
  };
}

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const listing = await prisma.serviceListing.findUnique({
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
          country: true,
        },
      },
    },
  });
  if (!listing || listing.status !== "OPEN") {
    return NextResponse.json({ error: "Service introuvable" }, { status: 404 });
  }
  return NextResponse.json({ listing: serialize(listing) });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const listing = await prisma.serviceListing.findUnique({ where: { id } });
  if (!listing) {
    return NextResponse.json({ error: "Service introuvable" }, { status: 404 });
  }
  if (listing.userId !== session.id && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  await prisma.serviceListing.update({
    where: { id },
    data: { status: "CLOSED" },
  });
  return NextResponse.json({ ok: true });
}
