import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { normalizeCurrency } from "@/lib/currency";
import { resolveCountryCode } from "@/lib/detect-country";
import { prisma } from "@/lib/prisma";
import {
  effectiveProductPriceCents,
  hasActivePromo,
  withProductPhotos,
} from "@/lib/shops-catalog";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(4000).optional(),
  country: z.string().min(2).max(80).optional(),
  city: z.string().min(2).max(80).optional(),
  currency: z.string().optional(),
  coverUrl: z.string().max(2000).optional().nullable(),
  logoUrl: z.string().max(2000).optional().nullable(),
  category: z
    .enum([
      "food_appliances",
      "cosmetics",
      "auto_parts",
      "electronics",
      "clothing_accessories",
    ])
    .optional(),
  action: z.enum(["publish", "close", "draft", "pause"]).optional(),
});

export async function GET(_request: Request, context: Ctx) {
  const { id } = await context.params;
  const session = await getSessionUser();

  const shop = await prisma.shop.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          ratingAvg: true,
          ratingCount: true,
          kycStatus: true,
          stripeConnectChargesEnabled: true,
          stripeConnectPayoutsEnabled: true,
          stripeConnectAccountId: true,
        },
      },
      products: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!shop) {
    return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });
  }

  const isOwner = session?.id === shop.userId;
  if (shop.status !== "OPEN" && !isOwner) {
    return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });
  }

  const products = (isOwner
    ? shop.products
    : shop.products.filter((p) => p.active)
  ).map((p) =>
    withProductPhotos({
      ...p,
      effectivePriceCents: effectiveProductPriceCents(p),
      hasPromo: hasActivePromo(p),
    })
  );

  return NextResponse.json({
    shop: {
      ...shop,
      products,
      canReceivePayments: true,
      isOwner,
    },
  });
}

export async function PATCH(request: Request, context: Ctx) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await context.params;
  const shop = await prisma.shop.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          kycStatus: true,
          stripeConnectAccountId: true,
          stripeConnectChargesEnabled: true,
          stripeConnectPayoutsEnabled: true,
        },
      },
      _count: { select: { products: { where: { active: true } } } },
    },
  });

  if (!shop || shop.userId !== session.id) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  try {
    const raw = await request.json();
    if (raw && typeof raw.country === "string") {
      const paren = raw.country.match(/\(([A-Za-z]{2})\)/);
      const code = paren?.[1]?.toUpperCase() ?? resolveCountryCode(raw.country);
      if (!code) {
        return NextResponse.json(
          { error: "Pays invalide. Choisissez un pays dans la liste." },
          { status: 400 }
        );
      }
      raw.country = code;
    }
    const body = patchSchema.parse(raw);
    const data: Record<string, unknown> = {};

    if (body.name !== undefined) data.name = body.name.trim();
    if (body.description !== undefined) data.description = body.description.trim();
    if (body.country !== undefined) data.country = body.country;
    if (body.city !== undefined) data.city = body.city.trim();
    if (body.coverUrl !== undefined) data.coverUrl = body.coverUrl || null;
    if (body.logoUrl !== undefined) data.logoUrl = body.logoUrl || null;
    if (body.category !== undefined) data.category = body.category;
    if (body.currency !== undefined) {
      const c = normalizeCurrency(body.currency);
      if (c) data.currency = c;
    }

    if (body.action === "publish") {
      data.status = "OPEN";
    } else if (body.action === "close") {
      data.status = "CLOSED";
    } else if (body.action === "draft" || body.action === "pause") {
      data.status = "DRAFT";
    }

    const updated = await prisma.shop.update({
      where: { id },
      data,
    });

    return NextResponse.json({ shop: updated });
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

export async function DELETE(_request: Request, context: Ctx) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await context.params;
  const shop = await prisma.shop.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          orders: { where: { status: { in: ["PAID", "FULFILLED"] } } },
        },
      },
    },
  });

  if (!shop || (shop.userId !== session.id && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  if (shop._count.orders > 0) {
    await prisma.shop.update({
      where: { id },
      data: { status: "CLOSED" },
    });
    return NextResponse.json({
      ok: true,
      closed: true,
      error: undefined,
    });
  }

  await prisma.shop.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
