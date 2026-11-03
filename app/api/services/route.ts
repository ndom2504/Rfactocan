import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { notifyNearbyForService } from "@/lib/nearby-notify";
import { prisma } from "@/lib/prisma";
import {
  PRICE_UNITS,
  getCategory,
  isServiceCategoryId,
  parseProductsJson,
} from "@/lib/services-catalog";
import { currencyForCountry, normalizeCurrency } from "@/lib/currency";
import { resolveCountryCode } from "@/lib/detect-country";
import { normalizeWebsiteUrl } from "@/lib/service-website";

const priceUnits = PRICE_UNITS.map((u) => u.id) as [string, ...string[]];

const createSchema = z.object({
  category: z.string().min(2),
  serviceType: z.string().min(2),
  title: z.string().trim().min(3, "Le titre doit faire au moins 3 caractères.").max(120),
  description: z
    .string()
    .trim()
    .min(10, "Décrivez en au moins 10 caractères.")
    .max(4000),
  country: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2, "Indiquez une ville.").max(120),
  priceAmount: z.coerce.number().min(0).optional(),
  priceUnit: z.enum(priceUnits).default("forfait"),
  currency: z.string().optional(),
  availableFrom: z.string().optional(),
  availableTo: z.string().optional(),
  photos: z.array(z.string()).max(5).optional(),
  products: z.array(z.string().min(1).max(80)).max(20).optional(),
  websiteUrl: z.string().max(300).optional(),
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = (searchParams.get("category") ?? "").trim();
  const serviceType = (searchParams.get("type") ?? "").trim();
  const country = (searchParams.get("country") ?? "").trim().toUpperCase();
  const city = (searchParams.get("city") ?? "").trim();
  const product = (searchParams.get("product") ?? "").trim().toLowerCase();
  const mine = searchParams.get("mine") === "1";
  const session = await getSessionUser();

  if (category && !isServiceCategoryId(category)) {
    return NextResponse.json({ error: "Catégorie invalide" }, { status: 400 });
  }
  if (category === "colis") {
    return NextResponse.json({
      listings: [],
      parcelHub: true,
    });
  }

  if (mine) {
    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    const mineListings = await prisma.serviceListing.findMany({
      where: { userId: session.id },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    return NextResponse.json({
      listings: mineListings.map(serialize),
    });
  }

  const listings = await prisma.serviceListing.findMany({
    where: {
      status: "OPEN",
      ...(category ? { category } : {}),
      ...(serviceType ? { serviceType } : {}),
      ...(country ? { country } : {}),
      ...(city
        ? { city: { contains: city, mode: "insensitive" as const } }
        : {}),
    },
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
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const serialized = listings.map(serialize);
  const filtered = product
    ? serialized.filter((l) =>
        l.products.some((p) => p.toLowerCase().includes(product))
      )
    : serialized;

  return NextResponse.json({
    listings: filtered,
  });
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const raw = await request.json();
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const input = raw as Record<string, unknown>;
      if (typeof input.country === "string") {
        const paren = input.country.match(/\(([A-Za-z]{2})\)/);
        const code =
          paren?.[1]?.toUpperCase() ?? resolveCountryCode(input.country);
        if (code) input.country = code;
      }
      if (typeof input.priceAmount === "string") {
        const n = Number(input.priceAmount.replace(/\s/g, "").replace(",", "."));
        if (Number.isFinite(n)) input.priceAmount = n;
      }
      if (input.priceAmount === "" || input.priceAmount == null) {
        delete input.priceAmount;
      }
    }
    const body = createSchema.parse(raw);
    if (!/^[A-Za-z]{2}$/.test(body.country)) {
      return NextResponse.json(
        { error: "Pays invalide. Choisissez un pays dans la liste." },
        { status: 400 }
      );
    }
    if (!isServiceCategoryId(body.category) || body.category === "colis") {
      return NextResponse.json(
        { error: "Catégorie non publiable ici (utilisez Colis & mobilité)." },
        { status: 400 }
      );
    }
    const cat = getCategory(body.category);
    const typeOk = cat?.types.some((t) => t.id === body.serviceType);
    if (!typeOk) {
      return NextResponse.json(
        { error: "Type de service invalide pour cette catégorie." },
        { status: 400 }
      );
    }

    const isGift = body.category === "don";
    const isProduct = body.category === "produit";
    const priceAmount = isGift ? 0 : (body.priceAmount ?? 0);
    if (isProduct && !(priceAmount > 0)) {
      return NextResponse.json(
        { error: "Indiquez un prix supérieur à 0." },
        { status: 400 }
      );
    }
    if (
      (isProduct || (isGift && body.serviceType === "produit")) &&
      !(body.photos && body.photos.length > 0)
    ) {
      return NextResponse.json(
        { error: "Ajoutez au moins une photo." },
        { status: 400 }
      );
    }

    const products =
      body.category === "vente" || body.category === "formation"
        ? parseProductsJson(body.products ?? [])
        : isProduct
          ? [body.title.trim()]
          : [];
    const websiteUrl = normalizeWebsiteUrl(body.websiteUrl);
    if (body.websiteUrl?.trim() && !websiteUrl) {
      return NextResponse.json(
        { error: "Lien du site invalide." },
        { status: 400 }
      );
    }

    const listing = await prisma.serviceListing.create({
      data: {
        userId: session.id,
        category: body.category,
        serviceType: body.serviceType,
        title: body.title.trim(),
        description: body.description.trim(),
        country: body.country.toUpperCase(),
        city: body.city.trim(),
        priceAmount: priceAmount ?? 0,
        priceUnit: body.priceUnit,
        currency:
          normalizeCurrency(body.currency) ??
          currencyForCountry(body.country) ??
          normalizeCurrency(session.preferredCurrency) ??
          "CAD",
        availableFrom: body.availableFrom
          ? new Date(body.availableFrom)
          : null,
        availableTo: body.availableTo ? new Date(body.availableTo) : null,
        photosJson: JSON.stringify(body.photos ?? []),
        productsJson: JSON.stringify(products),
        websiteUrl,
      },
    });

    void notifyNearbyForService(listing).catch((err) =>
      console.error("[nearby_service]", err)
    );

    return NextResponse.json({ listing: serialize(listing) }, { status: 201 });
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
