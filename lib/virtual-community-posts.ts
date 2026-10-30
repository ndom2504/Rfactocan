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
  title: string;
  /** Corps sans le bandeau Exemple / localisation. */
  body: string;
  /** Stable Unsplash (ou autre CDN public). */
  photoUrl: string;
  /** Source d’inspiration citée (pas de scraping live). */
  inspiredBy: string;
};

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
    title: "Chauffeur privé · aéroport Léon Mba",
    body: "Courses fiables Libreville ↔ aéroport, horaires tôt le matin. Véhicule climatisé, suivi WhatsApp. Idéal pour arrivées internationales et déplacements d’affaires.",
    photoUrl:
      "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1200&q=80",
    inspiredBy: "style annonces transport urbain / aéroport",
  },
  {
    id: "ga-hebergement-akanda",
    country: "GA",
    city: "Akanda",
    countryName: "Gabon",
    kind: "BUSINESS",
    title: "Chambre meublée calme près d’Akanda",
    body: "Studio propre, wifi, cuisine équipée. Séjours courts ou mission. Quartier résidentiel, accès facile vers Libreville. Photos et disponibilité sur demande.",
    photoUrl:
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
    inspiredBy: "style annonces hébergement local",
  },
  {
    id: "ga-colis-franceville",
    country: "GA",
    city: "Franceville",
    countryName: "Gabon",
    kind: "OPPORTUNITY",
    title: "Place bagage Libreville → Franceville",
    body: "Départ week-end prochain, place restante pour colis documentés (max 15 kg). Remise en main propre. Parfait pour médicaments, pièces détachées ou cadeaux famille.",
    photoUrl:
      "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=1200&q=80",
    inspiredBy: "style annonces colis / corridor intérieur",
  },
  {
    id: "ca-interac-mtl",
    country: "CA",
    city: "Montréal",
    countryName: "Canada",
    kind: "BUSINESS",
    title: "Aide déménagement · Plateau / Rosemont",
    body: "Camionnette + 2 personnes, créneaux soirs et samedis. Devis clair avant le jour J. Idéal studios et 3½. Paiement Interac accepté.",
    photoUrl:
      "https://images.unsplash.com/photo-1600518464441-9156a61fd20e?auto=format&fit=crop&w=1200&q=80",
    inspiredBy: "style annonces services locaux Canada",
  },
  {
    id: "ca-cours-fr-toronto",
    country: "CA",
    city: "Toronto",
    countryName: "Canada",
    kind: "COMMUNITY",
    title: "Cours de français conversation · soir",
    body: "Petits groupes (max 6), focus oral pour la diaspora et nouveaux arrivants. Première séance découverte. En ligne ou café du centre-ville.",
    photoUrl:
      "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80",
    inspiredBy: "style annonces formation / communauté",
  },
  {
    id: "ca-colis-mtl-lbv",
    country: "CA",
    city: "Montréal",
    countryName: "Canada",
    kind: "OPPORTUNITY",
    title: "Colis Montréal → Libreville (places)",
    body: "Voyageur vérifié, départ bientôt. Places pour documents et petits colis. Remise à l’aéroport ou point convenu. Discutez le détail dans Messages.",
    photoUrl:
      "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80",
    inspiredBy: "style corridor diaspora Canada ↔ Gabon",
  },
  {
    id: "ci-coiffure-abj",
    country: "CI",
    city: "Abidjan",
    countryName: "Côte d’Ivoire",
    kind: "BUSINESS",
    title: "Coiffure à domicile · Cocody / Plateau",
    body: "Tresses, pose, soins capillaires chez vous. Matériel propre, créneaux tôt le matin. Tarifs annoncés avant le rendez-vous.",
    photoUrl:
      "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80",
    inspiredBy: "style annonces beauté / services à domicile",
  },
  {
    id: "ci-transitaire-vridi",
    country: "CI",
    city: "Abidjan",
    countryName: "Côte d’Ivoire",
    kind: "BUSINESS",
    title: "Transitaire · dédouanement Vridi",
    body: "Accompagnement import/export léger, suivi dossier et conseils documents. Idéal entrepreneurs qui reçoivent du matériel depuis l’Europe ou le Canada.",
    photoUrl:
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80",
    inspiredBy: "style annonces transit / logistique",
  },
  {
    id: "cm-taxi-dla",
    country: "CM",
    city: "Douala",
    countryName: "Cameroun",
    kind: "BUSINESS",
    title: "Courses Douala · aéroport & centre",
    body: "Chauffeur ponctuel, bagages OK. Réservation la veille recommandée pour vols tôt. Tarif fixe annoncé avant départ.",
    photoUrl:
      "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1200&q=80",
    inspiredBy: "style annonces transport urbain",
  },
  {
    id: "sn-atelier-dakar",
    country: "SN",
    city: "Dakar",
    countryName: "Sénégal",
    kind: "COMMUNITY",
    title: "Atelier couture & retouches · Plateau",
    body: "Retouches rapides, costumes et tenues de cérémonie. Délais annoncés à l’avance. Venez avec vos tissus ou vos pièces à ajuster.",
    photoUrl:
      "https://images.unsplash.com/photo-1558171813-4c088753af8f?auto=format&fit=crop&w=1200&q=80",
    inspiredBy: "style annonces artisanat local",
  },
  {
    id: "fr-garde-paris",
    country: "FR",
    city: "Paris",
    countryName: "France",
    kind: "BUSINESS",
    title: "Garde d’enfants occasionnelle · 18e / 19e",
    body: "Étudiante sérieuse, expériences référencées. Soirs et week-ends. Première rencontre avec les parents avant toute garde.",
    photoUrl:
      "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=1200&q=80",
    inspiredBy: "style annonces famille / garde",
  },
  {
    id: "fr-colis-cdg-abj",
    country: "FR",
    city: "Paris",
    countryName: "France",
    kind: "OPPORTUNITY",
    title: "Place bagage Paris → Abidjan",
    body: "Vol bientôt, kilos disponibles pour colis familiaux. Documents et contenu déclarés. Contactez pour le détail du poids et du point de remise.",
    photoUrl:
      "https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&w=1200&q=80",
    inspiredBy: "style corridor diaspora France ↔ Afrique",
  },
];

function slotKey(now = new Date()) {
  const hour = now.getUTCHours();
  const slot = Math.floor(hour / 7); // 0..3 for 0-6, 7-13, 14-20, 21-23
  const day = now.toISOString().slice(0, 10);
  return `${day}-s${slot}`;
}

function buildBody(template: VirtualPostTemplate) {
  return [
    `📌 Exemple Rfacto · ${template.city}, ${template.countryName}`,
    "",
    template.body.trim(),
    "",
    `Photo & localisation pour montrer le style d’une vraie annonce. Inspiré de : ${template.inspiredBy}.`,
    "Publiez la vôtre depuis Annoncer — les membres pourront vous contacter.",
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
 * Publie jusqu’à `limit` annonces d’exemple pour le créneau 7h courant.
 * Idempotent via sourceKey `virtual:…`.
 */
export async function publishVirtualCommunityPosts(limit = 2) {
  const publisher = await ensureVirtualPublisherUser();
  const countries = await activeCountriesForVirtualPosts();
  const pool = templatesForCountries(countries);
  const slot = slotKey();

  const created: string[] = [];
  const skipped: string[] = [];

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
