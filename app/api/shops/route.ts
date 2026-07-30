import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { currencyForCountry, normalizeCurrency } from "@/lib/currency";
import { prisma } from "@/lib/prisma";
import { isShopCategoryId } from "@/lib/shops-catalog";

const createSchema = z.object({
  category: z.enum([
    "food_appliances",
    "cosmetics",
    "auto_parts",
    "electronics",
  ]),
  name: z.string().min(2).max(120),
  description: z.string().max(4000).optional().default(""),
  country: z.string().min(2).max(2),
  city: z.string().min(2).max(80),
  currency: z.string().optional(),
  coverUrl: z.string().max(2000).optional().nullable(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = (searchParams.get("category") ?? "").trim();
  const country = (searchParams.get("country") ?? "").trim().toUpperCase();
  const city = (searchParams.get("city") ?? "").trim();
  const mine = searchParams.get("mine") === "1";
  const session = await getSessionUser();

  if (category && !isShopCategoryId(category)) {
    return NextResponse.json({ error: "Catégorie invalide" }, { status: 400 });
  }

  if (mine) {
    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    const shops = await prisma.shop.findMany({
      where: { userId: session.id },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { products: true, orders: true } },
      },
    });
    return NextResponse.json({ shops });
  }

  const shops = await prisma.shop.findMany({
    where: {
      status: "OPEN",
      ...(category ? { category } : {}),
      ...(country ? { country } : {}),
      ...(city
        ? { city: { contains: city, mode: "insensitive" as const } }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 60,
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          ratingAvg: true,
          ratingCount: true,
        },
      },
      _count: {
        select: {
          products: { where: { active: true } },
        },
      },
    },
  });

  return NextResponse.json({ shops });
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = createSchema.parse(await request.json());
    const currency =
      normalizeCurrency(body.currency ?? "") ??
      currencyForCountry(body.country);

    const shop = await prisma.shop.create({
      data: {
        userId: session.id,
        category: body.category,
        name: body.name.trim(),
        description: (body.description ?? "").trim(),
        country: body.country.toUpperCase(),
        city: body.city.trim(),
        currency,
        coverUrl: body.coverUrl || null,
        status: "DRAFT",
      },
    });

    return NextResponse.json({ shop }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Données invalides" },
        { status: 400 }
      );
    }
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
