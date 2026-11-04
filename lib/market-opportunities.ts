import { prisma } from "@/lib/prisma";

const ACTOR = "zen-studio~aliexpress-scraper";
const DESK_EMAIL = "opportunities@rfacto.local";

/**
 * Mêmes familles de produits, prix selon le pays de livraison.
 * Quatre résultats par pays : assez pour une tendance, sans relancer un catalogue.
 */
const KEYWORDS = [
  "écouteurs bluetooth",
  "huile capillaire",
  "lampe led",
  "chargeur téléphone",
];

export type Market = {
  code: string;
  country: string;
  currency: string;
  label: string;
  destination: string;
};

/** Ordre d’affichage : États-Unis, France, porte Chine, puis le corridor déjà ouvert. */
export const FEATURED_MARKETS = ["us", "fr", "hk", "ca", "ma"];

const MARKETS: Market[] = [
  ["US", "USD", "États-Unis", "les États-Unis"],
  ["FR", "EUR", "France", "la France"],
  ["HK", "HKD", "Hong Kong", "Hong Kong"],
  ["CA", "CAD", "Canada", "le Canada"],
  ["MA", "MAD", "Maroc", "le Maroc"],
  ["AE", "AED", "Émirats arabes unis", "les Émirats arabes unis"],
  ["AR", "ARS", "Argentine", "l'Argentine"],
  ["AT", "EUR", "Autriche", "l'Autriche"],
  ["AU", "AUD", "Australie", "l'Australie"],
  ["BE", "EUR", "Belgique", "la Belgique"],
  ["BG", "BGN", "Bulgarie", "la Bulgarie"],
  ["BR", "BRL", "Brésil", "le Brésil"],
  ["CH", "CHF", "Suisse", "la Suisse"],
  ["CL", "CLP", "Chili", "le Chili"],
  ["CO", "COP", "Colombie", "la Colombie"],
  ["CY", "EUR", "Chypre", "Chypre"],
  ["CZ", "CZK", "Tchéquie", "la Tchéquie"],
  ["DE", "EUR", "Allemagne", "l'Allemagne"],
  ["DK", "DKK", "Danemark", "le Danemark"],
  ["EE", "EUR", "Estonie", "l'Estonie"],
  ["EG", "EGP", "Égypte", "l'Égypte"],
  ["ES", "EUR", "Espagne", "l'Espagne"],
  ["FI", "EUR", "Finlande", "la Finlande"],
  ["GB", "GBP", "Royaume-Uni", "le Royaume-Uni"],
  ["GR", "EUR", "Grèce", "la Grèce"],
  ["HR", "EUR", "Croatie", "la Croatie"],
  ["HU", "HUF", "Hongrie", "la Hongrie"],
  ["ID", "IDR", "Indonésie", "l'Indonésie"],
  ["IE", "EUR", "Irlande", "l'Irlande"],
  ["IL", "ILS", "Israël", "Israël"],
  ["IN", "INR", "Inde", "l'Inde"],
  ["IS", "ISK", "Islande", "l'Islande"],
  ["IT", "EUR", "Italie", "l'Italie"],
  ["JP", "JPY", "Japon", "le Japon"],
  ["KR", "KRW", "Corée du Sud", "la Corée du Sud"],
  ["KW", "KWD", "Koweït", "le Koweït"],
  ["LT", "EUR", "Lituanie", "la Lituanie"],
  ["LU", "EUR", "Luxembourg", "le Luxembourg"],
  ["LV", "EUR", "Lettonie", "la Lettonie"],
  ["MT", "EUR", "Malte", "Malte"],
  ["MX", "MXN", "Mexique", "le Mexique"],
  ["MY", "MYR", "Malaisie", "la Malaisie"],
  ["NG", "NGN", "Nigeria", "le Nigeria"],
  ["NL", "EUR", "Pays-Bas", "les Pays-Bas"],
  ["NO", "NOK", "Norvège", "la Norvège"],
  ["NZ", "NZD", "Nouvelle-Zélande", "la Nouvelle-Zélande"],
  ["PE", "PEN", "Pérou", "le Pérou"],
  ["PH", "PHP", "Philippines", "les Philippines"],
  ["PL", "PLN", "Pologne", "la Pologne"],
  ["PT", "EUR", "Portugal", "le Portugal"],
  ["QA", "QAR", "Qatar", "le Qatar"],
  ["RO", "RON", "Roumanie", "la Roumanie"],
  ["SA", "SAR", "Arabie saoudite", "l'Arabie saoudite"],
  ["SE", "SEK", "Suède", "la Suède"],
  ["SG", "SGD", "Singapour", "Singapour"],
  ["SI", "EUR", "Slovénie", "la Slovénie"],
  ["SK", "EUR", "Slovaquie", "la Slovaquie"],
  ["TH", "THB", "Thaïlande", "la Thaïlande"],
  ["TR", "TRY", "Turquie", "la Turquie"],
  ["TW", "TWD", "Taïwan", "Taïwan"],
  ["UA", "UAH", "Ukraine", "l'Ukraine"],
  ["VN", "VND", "Vietnam", "le Vietnam"],
  ["ZA", "ZAR", "Afrique du Sud", "l'Afrique du Sud"],
].map(([code, currency, label, destination]) => ({
  code,
  country: code,
  currency,
  label,
  destination,
}));

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
  shipsFrom?: string;
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
  origin?: string;
}) {
  const place = input.destination || input.marketLabel;
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
  const origin = input.origin ? `Expédié de ${input.origin}.` : "";
  const marketing = `À proposer aux membres qui vendent vers ${place}. Le prix se discute directement avec l'acheteur.`;
  return [
    trend,
    price,
    rating,
    ship,
    origin,
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
      origin: product.shipsFrom?.toUpperCase() === "CN" ? "Chine" : "",
    }),
  };
}

export function rankOpportunityPosts<T extends { sourceKey: string | null }>(
  posts: T[]
) {
  const best = new Map<string, T>();
  for (const post of posts) {
    const code = (post.sourceKey || "").split(":")[1] || "";
    if (!code || best.has(code)) continue;
    best.set(code, post);
  }
  const rank = (code: string) => {
    const index = FEATURED_MARKETS.indexOf(code);
    return index === -1 ? FEATURED_MARKETS.length : index;
  };
  return [...best.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0]))
    .map((entry) => entry[1]);
}

async function runMarket(market: Market, token: string) {
  const response = await fetch(
    `https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items?timeout=90`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        keywords: KEYWORDS,
        maxResults: 4,
        country: market.country,
        currency: market.currency,
        language: "fr_FR",
        sort: "orders",
        includeProductDetails: false,
        includeDescription: false,
        includeReviews: false,
      }),
      signal: AbortSignal.timeout(100_000),
    }
  );
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
  let cursor = 0;
  async function worker() {
    while (cursor < MARKETS.length) {
      const market = MARKETS[cursor];
      cursor += 1;
      try {
        const rows = await runMarket(market, token);
        const ranked = [...rows]
          .sort((a, b) => (Number(b.soldCount) || 0) - (Number(a.soldCount) || 0))
          .map((row) => toOpportunity(row, market))
          .filter((row): row is OpportunityDraft => Boolean(row))
          .slice(0, 2);
        drafts.push(...ranked);
        console.log(`${market.code} ${ranked.length}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(message);
        console.log(`${market.code} échec`);
      }
    }
  }
  await Promise.all(Array.from({ length: 4 }, () => worker()));

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

  const prefixes = [
    ...new Set(keys.map((key) => key.split(":").slice(0, 2).join(":") + ":")),
  ];
  let hidden = 0;
  for (const prefix of prefixes) {
    const keep = keys.filter((key) => key.startsWith(prefix));
    const result = await prisma.communityPost.updateMany({
      where: {
        status: "OPEN",
        sourceKey: { startsWith: prefix },
        NOT: { sourceKey: { in: keep } },
      },
      data: { status: "HIDDEN" },
    });
    hidden += result.count;
  }

  return {
    ok: true as const,
    found: drafts.length,
    created,
    updated,
    hidden,
    errors,
  };
}
