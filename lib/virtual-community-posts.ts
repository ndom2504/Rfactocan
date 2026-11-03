import type { CommunityPostKind } from "@prisma/client";
import {
  attachmentFromImageUrl,
  type CommunityAttachment,
} from "@/lib/community";
import { prisma } from "@/lib/prisma";

export const VIRTUAL_PUBLISHER_EMAIL = "inspiration@rfacto.local";
export const VIRTUAL_PUBLISHER_NAME = "Inspiration Rfacto";

export type VirtualPostTemplate = {
  id: string;
  country: string;
  city: string;
  countryName: string;
  kind: CommunityPostKind;
  /** Carte communauté : produit à vendre, service à vendre, ou don. */
  card: "PRODUCT" | "SERVICE" | "GIFT";
  priceLabel: string;
  title: string;
  /** Corps sans le bandeau Exemple / localisation. */
  body: string;
  /** Stable Unsplash (ou autre CDN public). */
  photoUrl: string;
  /** Source d’inspiration citée (pas de scraping live). */
  inspiredBy: string;
};

export function templateFromSourceKey(sourceKey?: string | null) {
  if (!sourceKey?.startsWith("virtual:")) return null;
  const id = sourceKey.split(":")[2];
  return VIRTUAL_POST_TEMPLATES.find((t) => t.id === id) ?? null;
}

/**
 * Catalogue éditorial (FR) — style d’annonces services / opportunités.
 * Contenu original Rfacto, localisé, pour montrer le design du feed.
 * Pas de scraping de sites officiels (fragile + droits).
 */
export const VIRTUAL_POST_TEMPLATES: VirtualPostTemplate[] = [
  {
    id: "ga-chauffeur-lbv",
    country: "GA",
    city: "Libreville",
    countryName: "Gabon",
    kind: "BUSINESS",
    card: "SERVICE",
    priceLabel: "15 000 XAF",
    title: "Course aéroport Léon Mba",
    body: "Chauffeur ponctuel, véhicule climatisé, bagages OK. Tarif annoncé avant le départ. Idéal arrivées tôt le matin.",
    photoUrl:
      "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1200&q=80",
    inspiredBy: "service transport",
  },
  {
    id: "ga-hebergement-akanda",
    country: "GA",
    city: "Akanda",
    countryName: "Gabon",
    kind: "BUSINESS",
    card: "PRODUCT",
    priceLabel: "45 000 XAF / nuit",
    title: "Studio meublé à Akanda",
    body: "Wifi, cuisine équipée, quartier calme. Séjour court ou mission. Photos réelles, dispo cette semaine.",
    photoUrl:
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
    inspiredBy: "hébergement",
  },
  {
    id: "ga-colis-franceville",
    country: "GA",
    city: "Libreville",
    countryName: "Gabon",
    kind: "OPPORTUNITY",
    card: "PRODUCT",
    priceLabel: "25 000 XAF",
    title: "iPhone 13 128 Go, état neuf",
    body: "Batterie 92 %, facture d’achat, vendu avec chargeur. Remise en main propre à Libreville.",
    photoUrl:
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=80",
    inspiredBy: "produit",
  },
  {
    id: "ca-interac-mtl",
    country: "CA",
    city: "Montréal",
    countryName: "Canada",
    kind: "BUSINESS",
    card: "SERVICE",
    priceLabel: "80 CAD",
    title: "Déménagement studio, le soir",
    body: "Camionnette et deux personnes, Plateau et Rosemont. Devis fixe avant le jour J.",
    photoUrl:
      "https://images.unsplash.com/photo-1600518464441-9156a61fd20e?auto=format&fit=crop&w=1200&q=80",
    inspiredBy: "service",
  },
  {
    id: "ca-cours-fr-toronto",
    country: "CA",
    city: "Toronto",
    countryName: "Canada",
    kind: "COMMUNITY",
    card: "GIFT",
    priceLabel: "Gratuit",
    title: "Vélo de ville à donner",
    body: "Cadre solide, freins à régler. À récupérer sur place ce week-end. Premier arrivé.",
    photoUrl:
      "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=1200&q=80",
    inspiredBy: "don",
  },
  {
    id: "ca-colis-mtl-lbv",
    country: "CA",
    city: "Montréal",
    countryName: "Canada",
    kind: "OPPORTUNITY",
    card: "PRODUCT",
    priceLabel: "220 CAD",
    title: "Canapé 2 places gris clair",
    body: "Tissu propre, pieds bois, se démonte. Idéal premier appartement. À emporter.",
    photoUrl:
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80",
    inspiredBy: "produit",
  },
  {
    id: "ci-coiffure-abj",
    country: "CI",
    city: "Abidjan",
    countryName: "Côte d’Ivoire",
    kind: "BUSINESS",
    card: "SERVICE",
    priceLabel: "8 000 XOF",
    title: "Tresses à domicile, Cocody",
    body: "Pose et soins, matériel propre. Créneau tôt le matin. Prix annoncé avant le rendez-vous.",
    photoUrl:
      "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80",
    inspiredBy: "service",
  },
  {
    id: "ci-transitaire-vridi",
    country: "CI",
    city: "Abidjan",
    countryName: "Côte d’Ivoire",
    kind: "BUSINESS",
    card: "PRODUCT",
    priceLabel: "35 000 XOF",
    title: "Machine à coudre Singer",
    body: "Fonctionne très bien, pédale et quelques bobines incluses. Idéale pour un atelier.",
    photoUrl:
      "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=1200&q=80",
    inspiredBy: "produit",
  },
  {
    id: "cm-taxi-dla",
    country: "CM",
    city: "Douala",
    countryName: "Cameroun",
    kind: "BUSINESS",
    card: "SERVICE",
    priceLabel: "5 000 XAF",
    title: "Course aéroport Douala",
    body: "Chauffeur ponctuel, bagages OK. Tarif fixe annoncé avant le départ.",
    photoUrl:
      "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1200&q=80",
    inspiredBy: "service",
  },
  {
    id: "sn-atelier-dakar",
    country: "SN",
    city: "Dakar",
    countryName: "Sénégal",
    kind: "COMMUNITY",
    card: "GIFT",
    priceLabel: "Gratuit",
    title: "Livres scolaires à donner",
    body: "Collège et lycée, bon état. À récupérer au Plateau. Parfait pour une rentrée.",
    photoUrl:
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1200&q=80",
    inspiredBy: "don",
  },
  {
    id: "fr-garde-paris",
    country: "FR",
    city: "Paris",
    countryName: "France",
    kind: "BUSINESS",
    card: "SERVICE",
    priceLabel: "15 EUR / h",
    title: "Garde d’enfants, soirs et week-ends",
    body: "18e et 19e. Première rencontre avec les parents avant toute garde.",
    photoUrl:
      "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=1200&q=80",
    inspiredBy: "service",
  },
  {
    id: "fr-colis-cdg-abj",
    country: "FR",
    city: "Paris",
    countryName: "France",
    kind: "OPPORTUNITY",
    card: "PRODUCT",
    priceLabel: "40 EUR",
    title: "Poussette compacte, très bon état",
    body: "Pliable, harnais complet, utilisée quelques mois. Remise en main propre dans le 18e.",
    photoUrl:
      "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=80",
    inspiredBy: "produit",
  },
];

/** Clé de jour UTC — Hobby = 1 run/jour ; cron externe peut appeler plusieurs fois. */
function slotKey(now = new Date()) {
  const day = now.toISOString().slice(0, 10);
  const hour = now.getUTCHours();
  // Sous-créneau 7 h pour permettre un cron externe sans republier le même lot.
  const slot = Math.floor(hour / 7);
  return `${day}-s${slot}`;
}

function buildBody(template: VirtualPostTemplate) {
  return [
    template.priceLabel,
    template.body.trim(),
    `Contact : ${VIRTUAL_PUBLISHER_NAME} · ${template.city}`,
  ].join("\n");
}

function attachmentFor(template: VirtualPostTemplate): CommunityAttachment[] {
  const att = attachmentFromImageUrl(
    template.photoUrl,
    `${template.city}-${template.id}.jpg`
  );
  return att ? [att] : [];
}

export async function ensureVirtualPublisherUser() {
  const existing = await prisma.user.findUnique({
    where: { email: VIRTUAL_PUBLISHER_EMAIL },
  });
  if (existing) {
    if (existing.displayName !== VIRTUAL_PUBLISHER_NAME) {
      return prisma.user.update({
        where: { id: existing.id },
        data: { displayName: VIRTUAL_PUBLISHER_NAME, status: "ACTIVE" },
      });
    }
    return existing;
  }
  return prisma.user.create({
    data: {
      email: VIRTUAL_PUBLISHER_EMAIL,
      displayName: VIRTUAL_PUBLISHER_NAME,
      role: "BOTH",
      status: "ACTIVE",
      preferredCurrency: "XAF",
      country: "Gabon",
      bio: "Compte Rfacto qui publie des exemples d’annonces pour inspirer la communauté.",
      verifiedAt: new Date(),
    },
  });
}

/** Pays où il y a des membres actifs (priorité), sinon GA/CA/CI. */
export async function activeCountriesForVirtualPosts(): Promise<string[]> {
  const rows = await prisma.user.groupBy({
    by: ["country"],
    where: {
      status: "ACTIVE",
      country: { not: null },
      email: { not: VIRTUAL_PUBLISHER_EMAIL },
    },
    _count: { _all: true },
    orderBy: { _count: { country: "desc" } },
    take: 12,
  });

  const codes = new Set<string>();
  for (const row of rows) {
    const raw = (row.country ?? "").trim();
    if (!raw) continue;
    const upper = raw.toUpperCase();
    if (/^[A-Z]{2}$/.test(upper)) {
      codes.add(upper);
      continue;
    }
    const match = VIRTUAL_POST_TEMPLATES.find(
      (t) =>
        t.countryName.toLowerCase() === raw.toLowerCase() ||
        raw.toLowerCase().includes(t.countryName.toLowerCase()) ||
        t.countryName.toLowerCase().includes(raw.toLowerCase())
    );
    if (match) codes.add(match.country);
  }

  if (codes.size === 0) {
    return ["GA", "CA", "CI"];
  }
  return [...codes];
}

function templatesForCountries(countries: string[]) {
  const set = new Set(countries.map((c) => c.toUpperCase()));
  const matched = VIRTUAL_POST_TEMPLATES.filter((t) => set.has(t.country));
  return matched.length > 0 ? matched : VIRTUAL_POST_TEMPLATES;
}

/**
 * Publie jusqu’à `limit` annonces d’exemple pour le créneau courant.
 * Idempotent via sourceKey `virtual:…`.
 */
export async function publishVirtualCommunityPosts(limit = 4) {
  const publisher = await ensureVirtualPublisherUser();
  const countries = await activeCountriesForVirtualPosts();
  const pool = templatesForCountries(countries);
  const slot = slotKey();

  const created: string[] = [];
  const skipped: string[] = [];

  const stored = await prisma.communityPost.findMany({
    where: { sourceKey: { startsWith: "virtual:" } },
    select: { id: true, sourceKey: true, title: true },
    take: 200,
  });
  for (const post of stored) {
    const template = templateFromSourceKey(post.sourceKey);
    if (!template || post.title === template.title) continue;
    await prisma.communityPost.update({
      where: { id: post.id },
      data: {
        kind: template.kind,
        title: template.title.slice(0, 120),
        body: buildBody(template).slice(0, 4000),
        attachmentsJson: JSON.stringify(attachmentFor(template) ?? []),
      },
    });
  }

  // Rotate by slot so the same country doesn’t always win.
  const start = Number.parseInt(slot.replace(/\D/g, "").slice(-2) || "0", 10) % pool.length;
  const ordered = [...pool.slice(start), ...pool.slice(0, start)];

  for (const template of ordered) {
    if (created.length >= limit) break;
    const sourceKey = `virtual:${template.country}:${template.id}:${slot}`;
    const existing = await prisma.communityPost.findUnique({
      where: { sourceKey },
      select: { id: true },
    });
    if (existing) {
      skipped.push(sourceKey);
      continue;
    }

    const post = await prisma.communityPost.create({
      data: {
        authorId: publisher.id,
        kind: template.kind,
        title: template.title,
        body: buildBody(template),
        attachmentsJson: JSON.stringify(attachmentFor(template)),
        status: "OPEN",
        sourceKey,
      },
      select: { id: true },
    });
    created.push(post.id);
  }

  return {
    ok: true as const,
    slot,
    countries,
    created,
    skipped: skipped.length,
    publisherId: publisher.id,
  };
}
