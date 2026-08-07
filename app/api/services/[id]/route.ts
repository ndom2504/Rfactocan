import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { currencyForCountry, normalizeCurrency } from "@/lib/currency";
import { prisma } from "@/lib/prisma";
import {
  PRICE_UNITS,
  getCategory,
  isServiceCategoryId,
  parseProductsJson,
} from "@/lib/services-catalog";
import { normalizeWebsiteUrl } from "@/lib/service-website";

type Ctx = { params: Promise<{ id: string }> };

const priceUnits = PRICE_UNITS.map((u) => u.id) as [string, ...string[]];

const patchSchema = z.object({
  category: z.string().min(2).optional(),
  serviceType: z.string().min(2).optional(),
  title: z.string().min(3).max(120).optional(),
  description: z.string().min(10).max(4000).optional(),
  country: z.string().min(2).max(2).optional(),
  city: z.string().min(2).max(80).optional(),
  priceAmount: z.coerce.number().nonnegative().optional().nullable(),
  priceUnit: z.enum(priceUnits).optional(),
  currency: z.string().optional(),
  availableFrom: z.string().optional().nullable(),
  availableTo: z.string().optional().nullable(),
  photos: z.array(z.string()).max(5).optional(),
  products: z.array(z.string().min(1).max(80)).max(20).optional(),
  websiteUrl: z.string().max(300).optional().nullable(),
});

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
          kycStatus: true,
          avatarUrl: true,
          country: true,
        },
      },
    },
  });
  if (!listing) {
    return NextResponse.json({ error: "Service introuvable" }, { status: 404 });
  }

  if (listing.status !== "OPEN") {
    const session = await getSessionUser();
    const allowed =
      session &&
      (session.id === listing.userId || session.role === "ADMIN");
    if (!allowed) {
      return NextResponse.json({ error: "Service introuvable" }, { status: 404 });
    }
  }

  return NextResponse.json({ listing: serialize(listing) });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const existing = await prisma.serviceListing.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Service introuvable" }, { status: 404 });
  }
  if (existing.userId !== session.id && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  if (existing.status === "CLOSED" && session.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Ce service est fermé et ne peut plus être modifié." },
      { status: 400 }
    );
  }

  try {
    const body = patchSchema.parse(await request.json());
    const category = body.category ?? existing.category;
    const serviceType = body.serviceType ?? existing.serviceType;

    if (body.category !== undefined || body.serviceType !== undefined) {
      if (!isServiceCategoryId(category) || category === "colis") {
        return NextResponse.json(
          { error: "Catégorie non publiable ici." },
          { status: 400 }
        );
      }
      const cat = getCategory(category);
      const typeOk = cat?.types.some((t) => t.id === serviceType);
      if (!typeOk) {
        return NextResponse.json(
          { error: "Type de service invalide pour cette catégorie." },
          { status: 400 }
        );
      }
    }

    let websiteUrl: string | null | undefined = undefined;
    if (body.websiteUrl !== undefined) {
      if (!body.websiteUrl || !body.websiteUrl.trim()) {
        websiteUrl = null;
      } else {
        const normalized = normalizeWebsiteUrl(body.websiteUrl);
        if (!normalized) {
          return NextResponse.json(
            { error: "Lien du site invalide." },
            { status: 400 }
          );
        }
        websiteUrl = normalized;
      }
    }

    const products =
      body.products !== undefined
        ? category === "vente" || category === "formation"
          ? parseProductsJson(body.products)
          : []
        : undefined;

    const country =
      body.country !== undefined
        ? body.country.toUpperCase()
        : existing.country;

    const updated = await prisma.serviceListing.update({
      where: { id },
      data: {
        ...(body.category !== undefined ? { category } : {}),
        ...(body.serviceType !== undefined ? { serviceType } : {}),
        ...(body.title !== undefined ? { title: body.title.trim() } : {}),
        ...(body.description !== undefined
          ? { description: body.description.trim() }
          : {}),
        ...(body.country !== undefined ? { country } : {}),
        ...(body.city !== undefined ? { city: body.city.trim() } : {}),
        ...(body.priceAmount !== undefined
          ? { priceAmount: body.priceAmount }
          : {}),
        ...(body.priceUnit !== undefined ? { priceUnit: body.priceUnit } : {}),
        ...(body.currency !== undefined
          ? {
              currency:
                normalizeCurrency(body.currency) ??
                currencyForCountry(country) ??
                existing.currency,
            }
          : {}),
        ...(body.availableFrom !== undefined
          ? {
              availableFrom: body.availableFrom
                ? new Date(body.availableFrom)
                : null,
            }
          : {}),
        ...(body.availableTo !== undefined
          ? {
              availableTo: body.availableTo
                ? new Date(body.availableTo)
                : null,
            }
          : {}),
        ...(body.photos !== undefined
          ? { photosJson: JSON.stringify(body.photos) }
          : {}),
        ...(products !== undefined
          ? { productsJson: JSON.stringify(products) }
          : {}),
        ...(websiteUrl !== undefined ? { websiteUrl } : {}),
      },
    });

    return NextResponse.json({ listing: serialize(updated) });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.issues[0]?.message ?? "Données invalides" },
        { status: 400 }
      );
    }
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
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
