import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  effectiveProductPriceCents,
  hasActivePromo,
} from "@/lib/shops-catalog";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  title: z.string().min(2).max(120).optional(),
  description: z.string().max(4000).optional(),
  price: z.coerce.number().positive().max(1_000_000).optional(),
  promoPrice: z.coerce.number().positive().max(1_000_000).optional().nullable(),
  promoLabel: z.string().max(80).optional().nullable(),
  promoEndsAt: z.string().optional().nullable(),
  photoUrl: z.string().max(2000).optional().nullable(),
  active: z.boolean().optional(),
});

function toCents(major: number, currency: string) {
  const code = currency.toUpperCase();
  if (code === "XOF" || code === "XAF") {
    return Math.round(major);
  }
  return Math.round(major * 100);
}

function fromCents(cents: number, currency: string) {
  const code = currency.toUpperCase();
  if (code === "XOF" || code === "XAF") return cents;
  return cents / 100;
}

export async function GET(_request: Request, context: Ctx) {
  const { id } = await context.params;
  const session = await getSessionUser();

  const product = await prisma.shopProduct.findUnique({
    where: { id },
    include: {
      shop: {
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              ratingAvg: true,
              ratingCount: true,
              kycStatus: true,
              stripeConnectAccountId: true,
              stripeConnectChargesEnabled: true,
              stripeConnectPayoutsEnabled: true,
            },
          },
        },
      },
    },
  });

  if (!product) {
    return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
  }

  const isOwner = session?.id === product.shop.userId;
  if (
    (product.shop.status !== "OPEN" || !product.active) &&
    !isOwner
  ) {
    return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
  }

  return NextResponse.json({
    product: {
      ...product,
      effectivePriceCents: effectiveProductPriceCents(product),
      hasPromo: hasActivePromo(product),
      priceMajor: fromCents(product.priceCents, product.shop.currency),
      promoPriceMajor:
        product.promoPriceCents != null
          ? fromCents(product.promoPriceCents, product.shop.currency)
          : null,
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
  const existing = await prisma.shopProduct.findUnique({
    where: { id },
    include: { shop: true },
  });
  if (!existing || existing.shop.userId !== session.id) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  try {
    const body = patchSchema.parse(await request.json());
    const data: Record<string, unknown> = {};

    if (body.title !== undefined) data.title = body.title.trim();
    if (body.description !== undefined) data.description = body.description.trim();
    if (body.photoUrl !== undefined) data.photoUrl = body.photoUrl || null;
    if (body.active !== undefined) data.active = body.active;
    if (body.promoLabel !== undefined) {
      data.promoLabel = body.promoLabel?.trim() || null;
    }
    if (body.promoEndsAt !== undefined) {
      data.promoEndsAt = body.promoEndsAt ? new Date(body.promoEndsAt) : null;
    }

    const priceCents =
      body.price !== undefined
        ? toCents(body.price, existing.shop.currency)
        : existing.priceCents;

    if (body.price !== undefined) data.priceCents = priceCents;

    if (body.promoPrice !== undefined) {
      if (body.promoPrice == null) {
        data.promoPriceCents = null;
      } else {
        const promoCents = toCents(body.promoPrice, existing.shop.currency);
        if (promoCents >= priceCents) {
          return NextResponse.json(
            { error: "Le prix promo doit être inférieur au prix normal." },
            { status: 400 }
          );
        }
        data.promoPriceCents = promoCents;
      }
    }

    const product = await prisma.shopProduct.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      product: {
        ...product,
        effectivePriceCents: effectiveProductPriceCents(product),
        hasPromo: hasActivePromo(product),
      },
    });
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
  const existing = await prisma.shopProduct.findUnique({
    where: { id },
    include: { shop: true },
  });
  if (!existing || existing.shop.userId !== session.id) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  // Soft-delete: deactivate (keep order history)
  const product = await prisma.shopProduct.update({
    where: { id },
    data: { active: false },
  });

  return NextResponse.json({ product });
}
