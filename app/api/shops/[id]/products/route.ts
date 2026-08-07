import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  effectiveProductPriceCents,
  hasActivePromo,
  productPhotoFields,
  withProductPhotos,
} from "@/lib/shops-catalog";

type Ctx = { params: Promise<{ id: string }> };

const createSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(4000).optional().default(""),
  /** Major units (e.g. 19.99) — converted to cents for CAD/USD/EUR. */
  price: z.coerce.number().positive().max(1_000_000),
  promoPrice: z.coerce.number().positive().max(1_000_000).optional().nullable(),
  promoLabel: z.string().max(80).optional().nullable(),
  promoEndsAt: z.string().optional().nullable(),
  photoUrl: z.string().max(2000).optional().nullable(),
  photos: z.array(z.string().max(2000)).max(8).optional().nullable(),
  warranty: z.string().max(120).optional().nullable(),
  stockQty: z.coerce.number().int().min(0).max(1_000_000).optional().nullable(),
  highlights: z.string().max(2000).optional().nullable(),
  active: z.boolean().optional().default(true),
});

function toCents(major: number, currency: string) {
  const code = currency.toUpperCase();
  if (code === "XOF" || code === "XAF") {
    return Math.round(major);
  }
  return Math.round(major * 100);
}

export async function GET(_request: Request, context: Ctx) {
  const { id } = await context.params;
  const session = await getSessionUser();
  const shop = await prisma.shop.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true },
  });
  if (!shop) {
    return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });
  }
  const isOwner = session?.id === shop.userId;
  if (shop.status !== "OPEN" && !isOwner) {
    return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });
  }

  const products = await prisma.shopProduct.findMany({
    where: {
      shopId: id,
      ...(isOwner ? {} : { active: true }),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    products: products.map((p) =>
      withProductPhotos({
        ...p,
        effectivePriceCents: effectiveProductPriceCents(p),
        hasPromo: hasActivePromo(p),
      })
    ),
  });
}

export async function POST(request: Request, context: Ctx) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await context.params;
  const shop = await prisma.shop.findUnique({ where: { id } });
  if (!shop || shop.userId !== session.id) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  try {
    const body = createSchema.parse(await request.json());
    const priceCents = toCents(body.price, shop.currency);
    let promoPriceCents: number | null = null;
    if (body.promoPrice != null) {
      promoPriceCents = toCents(body.promoPrice, shop.currency);
      if (promoPriceCents >= priceCents) {
        return NextResponse.json(
          { error: "Le prix promo doit être inférieur au prix normal." },
          { status: 400 }
        );
      }
    }

    const isElectronics = shop.category === "electronics";
    const photos = productPhotoFields({
      photos: body.photos,
      photoUrl: body.photoUrl,
    });

    const product = await prisma.shopProduct.create({
      data: {
        shopId: id,
        title: body.title.trim(),
        description: (body.description ?? "").trim(),
        priceCents,
        promoPriceCents,
        promoLabel: body.promoLabel?.trim() || null,
        promoEndsAt: body.promoEndsAt ? new Date(body.promoEndsAt) : null,
        photoUrl: photos.photoUrl,
        photosJson: photos.photosJson,
        warranty: isElectronics
          ? body.warranty?.trim() || null
          : null,
        stockQty: isElectronics
          ? body.stockQty == null
            ? null
            : body.stockQty
          : null,
        highlights: isElectronics
          ? body.highlights?.trim() || null
          : null,
        active: body.active ?? true,
      },
    });

    return NextResponse.json(
      {
        product: withProductPhotos({
          ...product,
          effectivePriceCents: effectiveProductPriceCents(product),
          hasPromo: hasActivePromo(product),
        }),
      },
      { status: 201 }
    );
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
