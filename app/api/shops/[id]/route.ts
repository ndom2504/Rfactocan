import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { travelerCanReceivePayments } from "@/lib/connect";
import { normalizeCurrency } from "@/lib/currency";
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
  country: z.string().min(2).max(2).optional(),
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
  action: z.enum(["publish", "close", "draft"]).optional(),
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
      canReceivePayments: travelerCanReceivePayments(shop.user),
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
    const body = patchSchema.parse(await request.json());
    const data: Record<string, unknown> = {};

    if (body.name !== undefined) data.name = body.name.trim();
    if (body.description !== undefined) data.description = body.description.trim();
    if (body.country !== undefined) data.country = body.country.toUpperCase();
    if (body.city !== undefined) data.city = body.city.trim();
    if (body.coverUrl !== undefined) data.coverUrl = body.coverUrl || null;
    if (body.logoUrl !== undefined) data.logoUrl = body.logoUrl || null;
    if (body.category !== undefined) data.category = body.category;
    if (body.currency !== undefined) {
      const c = normalizeCurrency(body.currency);
      if (c) data.currency = c;
    }

    if (body.action === "publish") {
      if (!travelerCanReceivePayments(shop.user)) {
        return NextResponse.json(
          {
            error:
              "KYC et Stripe Connect requis pour publier et recevoir des paiements.",
            code: "PAYOUTS_REQUIRED",
          },
          { status: 400 }
        );
      }
      if (shop._count.products < 1) {
        return NextResponse.json(
          { error: "Ajoutez au moins un produit actif avant de publier." },
          { status: 400 }
        );
      }
      data.status = "OPEN";
    } else if (body.action === "close") {
      data.status = "CLOSED";
    } else if (body.action === "draft") {
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
