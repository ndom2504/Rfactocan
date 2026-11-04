import { prisma } from "@/lib/prisma";

const ACTOR = "zen-studio~aliexpress-scraper";
const DESK_EMAIL = "opportunities@rfacto.local";

/**
 * Termes utiles au corridor Canada–Afrique : objets légers, souvent renvoyés
 * ou revendus. Le total est plafonné pour limiter le coût Apify.
 */
const KEYWORDS = [
  "écouteurs bluetooth",
  "huile capillaire",
  "lampe led",
  "chargeur téléphone",
];

const MARKETS = [
  {
    code: "CA",
    country: "CA",
    currency: "CAD",
    label: "Canada",
    destination: "",
  },
  {
    code: "MA",
    country: "MA",
    currency: "MAD",
    label: "Maroc",
    destination: "le Maroc",
  },
] as const;

type Market = (typeof MARKETS)[number];

type RawProduct = {
  productId?: string | number;
  title?: string;
  image?: string;
  url?: string;
  price?: number;
  priceFormatted?: string;
  currency?: string;
  soldCount?: number;
  rating?: number;
  deliveryDaysMin?: number;
  deliveryDaysMax?: number;
  available?: boolean;
};

export type OpportunityDraft = {
  sourceKey: string;
  title: string;
  body: string;
  imageUrl: string;
  productUrl: string;
};

function apifyToken() {
  return process.env.APIFY_API_KEY || process.env._APIFY_API_KEY || "";
}

export function formatCount(value: number) {
  return new Intl.NumberFormat("fr-CA").format(Math.round(value));
}

export function deliveryLabel(min?: number, max?: number) {
  if (!min || !max || min <= 0 || max <= 0) return "";
  if (min === max) return `${min} jours`;
  return `${min} à ${max} jours`;
}

export function opportunityBody(input: {
  soldCount: number;
  priceLabel: string;
  delivery: string;
  marketLabel: string;
  destination: string;
  productUrl: string;
  rating?: number;
}) {
  const trend =
    input.soldCount > 0
      ? `Tendance : ${formatCount(input.soldCount)} ventes.`
      : "Tendance : produit visible sur ce marché.";
  const price = `Prix : ${input.priceLabel}.`;
  const rating =
    input.rating && input.rating > 0
      ? `Note : ${input.rating.toFixed(1).replace(".", ",")} / 5.`
      : "";
  const ship = input.delivery
    ? `Livraison estimée : ${input.delivery}.`
    : "";
  const marketing = input.destination
    ? `À proposer aux membres qui envoient vers ${input.destination}. Le prix se discute directement avec l'acheteur.`
    : "Demandé au Canada. À proposer dans la communauté ; le prix se discute avec l'acheteur.";
  return [
    trend,
    price,
    rating,
    ship,
    marketing,
    "",
    `Source : AliExpress · ${input.marketLabel}`,
    input.productUrl,
    "#Opportunité",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

function priceLabel(product: RawProduct, fallbackCurrency: string) {
  const formatted = product.priceFormatted?.trim();
  if (formatted) return formatted;
  if (typeof product.price === "number") {
    return `${product.price} ${product.currency || fallbackCurrency}`;
  }
  return "";
}

export function toOpportunity(
  product: RawProduct,
  market: Market
): OpportunityDraft | null {
  if (product.available === false) return null;
  const id = String(product.productId || "").trim();
  const title = (product.title || "").replace(/\s+/g, " ").trim();
  const image = (product.image || "").trim();
  const productUrl = (product.url || "").trim();
  const price = priceLabel(product, market.currency);
  if (!id || title.length < 8 || !/^https:\/\/.+\.(jpe?g|png|webp)(\?|$)/i.test(image)) {
    return null;
  }
  if (!productUrl.startsWith("https://")) return null;
  if (!price) return null;
  return {
    sourceKey: `opportunity:${market.code.toLowerCase()}:${id}`,
    title: title.slice(0, 140),
    imageUrl: image,
    productUrl,
    body: opportunityBody({
      soldCount: Number(product.soldCount) || 0,
      priceLabel: price,
      delivery: deliveryLabel(product.deliveryDaysMin, product.deliveryDaysMax),
      marketLabel: market.label,
      destination: market.destination,
      productUrl,
      rating: typeof product.rating === "number" ? product.rating : undefined,
    }),
  };
}

async function runMarket(market: Market, token: string) {
  const response = await fetch(
    `https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items?timeout=240`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        keywords: KEYWORDS,
        maxResults: 8,
        country: market.country,
        currency: market.currency,
        language: "fr_FR",
        sort: "orders",
        includeProductDetails: false,
        includeDescription: false,
        includeReviews: false,
      }),
      signal: AbortSignal.timeout(260_000),
    }
  );
  if (response.status === 400 && market.currency !== "EUR") {
    return runMarket({ ...market, currency: "EUR" }, token);
  }
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 180);
    throw new Error(`Apify ${market.code} ${response.status} ${detail}`);
  }
  const data = (await response.json()) as RawProduct[];
  return Array.isArray(data) ? data : [];
}

async function deskAuthorId() {
  const author = await prisma.user.upsert({
    where: { email: DESK_EMAIL },
    update: { displayName: "Opportunités" },
    create: {
      email: DESK_EMAIL,
      displayName: "Opportunités",
      passwordHash: "disabled",
      role: "BOTH",
      status: "ACTIVE",
      country: "Canada",
      bio: "Pistes commerciales pour les vendeurs, avec la source.",
    },
  });
  return author.id;
}

export async function publishMarketOpportunities() {
  const token = apifyToken();
  if (!token) {
    return { ok: false as const, error: "Clé Apify absente" };
  }

  const drafts: OpportunityDraft[] = [];
  const errors: string[] = [];
  for (const market of MARKETS) {
    try {
      const rows = await runMarket(market, token);
      const ranked = [...rows]
        .sort((a, b) => (Number(b.soldCount) || 0) - (Number(a.soldCount) || 0))
        .map((row) => toOpportunity(row, market))
        .filter((row): row is OpportunityDraft => Boolean(row));
      drafts.push(...ranked.slice(0, 6));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (!drafts.length) {
    return { ok: false as const, error: errors.join(" | ") || "Aucun produit" };
  }

  const authorId = await deskAuthorId();
  const keys = drafts.map((draft) => draft.sourceKey);
  let created = 0;
  let updated = 0;

  for (const draft of drafts) {
    const attachmentsJson = JSON.stringify([
      { url: draft.imageUrl, contentType: "image/jpeg", name: "produit.jpg" },
    ]);
    const existing = await prisma.communityPost.findUnique({
      where: { sourceKey: draft.sourceKey },
    });
    if (!existing) {
      await prisma.communityPost.create({
        data: {
          authorId,
          kind: "OPPORTUNITY",
          status: "OPEN",
          title: draft.title,
          body: draft.body,
          attachmentsJson,
          sourceKey: draft.sourceKey,
        },
      });
      created += 1;
      continue;
    }
    const same =
      existing.title === draft.title &&
      existing.body === draft.body &&
      existing.attachmentsJson === attachmentsJson &&
      existing.status === "OPEN";
    if (same) continue;
    await prisma.communityPost.update({
      where: { id: existing.id },
      data: {
        title: draft.title,
        body: draft.body,
        attachmentsJson,
        status: "OPEN",
        createdAt: new Date(),
      },
    });
    updated += 1;
  }

  const hidden = await prisma.communityPost.updateMany({
    where: {
      status: "OPEN",
      sourceKey: { startsWith: "opportunity:" },
      NOT: { sourceKey: { in: keys } },
    },
    data: { status: "HIDDEN" },
  });

  return {
    ok: true as const,
    found: drafts.length,
    created,
    updated,
    hidden: hidden.count,
    errors,
  };
}
