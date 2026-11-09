import { prisma } from "@/lib/prisma";

const FETCH_HEADERS = {
  Accept: "text/html, application/xhtml+xml, application/xml, text/xml, */*",
  "User-Agent": "RfactoCommunity/1.0 (official legal resources)",
  "Accept-Language": "fr-CA,fr;q=0.9",
};

const DESK_EMAIL = "barreau@rfacto.local";

export type BarreauCategory =
  | "Mentorat"
  | "Ressources juridiques"
  | "Réseaux et associations"
  | "Cours et formations"
  | "Préparation au Barreau"
  | "Conférences et événements"
  | "Stages et emplois"
  | "Actualités juridiques";

type OfficialPage = {
  url: string;
  sourceName: string;
  category: BarreauCategory;
  title: string;
  summary: string;
  region: string;
};

/**
 * Pages officielles déjà vérifiées. Le texte est celui de la source.
 * Aucun programme, date ou mentorat n'est inventé.
 */
const OFFICIAL_PAGES: OfficialPage[] = [
  {
    url: "https://www.barreau.qc.ca/fr/futurs-membres/",
    sourceName: "Barreau du Québec",
    category: "Préparation au Barreau",
    title: "Futurs membres : devenir avocat au Québec",
    summary:
      "Le Barreau du Québec décrit les parcours pour obtenir le permis d'exercer, selon que l'on est étudiant au Québec, avocat canadien, français ou juriste étranger.",
    region: "Québec",
  },
  {
    url: "https://www.barreau.qc.ca/fr/futurs-membres/etudiant/etudiant-quebec/",
    sourceName: "Barreau du Québec",
    category: "Préparation au Barreau",
    title: "Étudiant au Québec : les étapes vers la profession",
    summary:
      "Baccalauréat ou licence en droit, examen du dossier, formation à l'École du Barreau, puis stage de six mois sous la supervision d'un maître de stage.",
    region: "Québec",
  },
  {
    url: "https://www.ecoledubarreau.qc.ca/",
    sourceName: "École du Barreau",
    category: "Cours et formations",
    title: "Programme de professionnalisation de l'École du Barreau",
    summary:
      "Admission, inscription, apprentissages spécifiques, clinique juridique, puis stage de six mois avant l'assermentation au Barreau du Québec.",
    region: "Québec",
  },
  {
    url: "https://admissionecole.barreau.qc.ca/accueil",
    sourceName: "École du Barreau",
    category: "Préparation au Barreau",
    title: "Admission à l'École du Barreau",
    summary:
      "Les demandes d'admission se font en ligne uniquement pendant les périodes prescrites par le Comité de la formation professionnelle.",
    region: "Québec",
  },
  {
    url: "https://www.barreau.qc.ca/fr/nouvelle/",
    sourceName: "Barreau du Québec",
    category: "Actualités juridiques",
    title: "Nouvelles du Barreau du Québec",
    summary:
      "Avis aux membres, mémoires, appels de candidatures et dossiers publics publiés par l'Ordre.",
    region: "Québec",
  },
  {
    url: "https://www.barreau.qc.ca/fr/grand-public/acces-justice/ressources-acces-justice/",
    sourceName: "Barreau du Québec",
    category: "Ressources juridiques",
    title: "Ressources d'accès à la justice",
    summary:
      "Le Barreau recense des organismes, dont le Jeune Barreau de Montréal, qui offrent de l'information juridique et des services aux citoyens.",
    region: "Québec",
  },
];

export type BarreauDraft = {
  sourceKey: string;
  title: string;
  body: string;
  imageUrl: string;
  sourceUrl: string;
  category: BarreauCategory;
};

export function barreauBody(input: {
  category: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  region?: string;
}) {
  const summary = input.summary.replace(/\s+/g, " ").trim().slice(0, 320);
  return [
    input.category,
    summary,
    input.region ? `Territoire : ${input.region}` : "",
    "",
    `Source : ${input.sourceName}`,
    input.sourceUrl,
    "#Barreau",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

function keyFor(url: string) {
  let hash = 0;
  for (const char of url) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  return hash.toString(36);
}

function isOfficialHost(url: string) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return [
      "barreau.qc.ca",
      "ecoledubarreau.qc.ca",
      "admissionecole.barreau.qc.ca",
      "soquij.qc.ca",
      "blogue.soquij.qc.ca",
      "justice.gouv.qc.ca",
      "cnq.org",
    ].some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
}

function isRasterImageUrl(url: string) {
  if (!/^https:\/\//i.test(url)) return false;
  if (/\.svg(?:[.?]|$)/i.test(url)) return false;
  if (!/\.(?:jpe?g|png|webp)(?:[.?]|$)/i.test(url)) return false;
  if (isOfficialHost(url)) return true;
  return !/icon|favicon|sprite|noun-edit/i.test(url);
}

function absoluteUrl(href: string, base: string) {
  try {
    return new URL(href, base).toString();
  } catch {
    return "";
  }
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: FETCH_HEADERS,
    signal: AbortSignal.timeout(10_000),
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.text();
}

async function pageImage(url: string) {
  try {
    const html = await fetchText(url);
    const patterns = [
      /property=["']og:image(?::secure_url)?["'][^>]*content=["']([^"']+)["']/i,
      /content=["']([^"']+)["'][^>]*property=["']og:image(?::secure_url)?["']/i,
      /name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i,
    ];
    for (const pattern of patterns) {
      const found = html.match(pattern)?.[1];
      const resolved = found ? absoluteUrl(found, url) : "";
      if (resolved && isRasterImageUrl(resolved)) return resolved;
    }
  } catch (error) {
    console.error("[community-barreau] image", error instanceof Error ? error.message : error);
  }
  return "";
}

function pageAlive(html: string) {
  return html.length > 400 && !/<title>[^<]*(404|introuvable|not found)[^<]*<\/title>/i.test(html);
}

async function newsArticles() {
  const listing = "https://www.barreau.qc.ca/fr/nouvelle/";
  try {
    const html = await fetchText(listing);
    const slugs = [
      ...new Set(
        [...html.matchAll(/href="(\/fr\/nouvelle\/article\/[^"?#"]+)"/gi)].map(
          (match) => match[1]
        )
      ),
    ].slice(0, 8);
    const drafts: BarreauDraft[] = [];
    for (const slug of slugs) {
      const sourceUrl = absoluteUrl(slug, listing);
      if (!isOfficialHost(sourceUrl)) continue;
      const imageUrl = await pageImage(sourceUrl);
      if (!imageUrl) continue;
      let title = "";
      let summary = "";
      try {
        const article = await fetchText(sourceUrl);
        if (!pageAlive(article)) continue;
        title =
          article.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() ||
          article.match(/<title>([^<]+)<\/title>/i)?.[1]?.split("|")[0]?.trim() ||
          "";
        summary =
          article.match(/property=["']og:description["'][^>]*content=["']([^"']+)["']/i)?.[1] ||
          article.match(/name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1] ||
          "";
      } catch {
        continue;
      }
      if (title.length < 12) continue;
      drafts.push({
        sourceKey: `barreau:actualites:${keyFor(sourceUrl)}`,
        title: title.slice(0, 140),
        imageUrl,
        sourceUrl,
        category: "Actualités juridiques",
        body: barreauBody({
          category: "Actualités juridiques",
          summary: summary || title,
          sourceName: "Barreau du Québec",
          sourceUrl,
          region: "Québec",
        }),
      });
      if (drafts.length >= 4) break;
    }
    return drafts;
  } catch (error) {
    console.error("[community-barreau] news", error instanceof Error ? error.message : error);
    return [];
  }
}

export async function collectBarreauResources() {
  const drafts: BarreauDraft[] = [];
  for (const page of OFFICIAL_PAGES) {
    try {
      const html = await fetchText(page.url);
      if (!pageAlive(html)) continue;
      const imageUrl = await pageImage(page.url);
      if (!imageUrl) continue;
      drafts.push({
        sourceKey: `barreau:page:${keyFor(page.url)}`,
        title: page.title,
        imageUrl,
        sourceUrl: page.url,
        category: page.category,
        body: barreauBody({
          category: page.category,
          summary: page.summary,
          sourceName: page.sourceName,
          sourceUrl: page.url,
          region: page.region,
        }),
      });
    } catch (error) {
      console.error("[community-barreau] page", error instanceof Error ? error.message : error);
    }
  }
  drafts.push(...(await newsArticles()));
  const seen = new Set<string>();
  return drafts.filter((draft) => {
    if (seen.has(draft.sourceUrl)) return false;
    seen.add(draft.sourceUrl);
    return true;
  });
}

async function deskAuthorId() {
  const bio = "Parcours du Barreau du Québec, avec la source officielle.";
  const existing = await prisma.user.findUnique({ where: { email: DESK_EMAIL } });
  if (existing) {
    if (existing.displayName !== "Parcours du Barreau" || existing.bio !== bio) {
      return (
        await prisma.user.update({
          where: { id: existing.id },
          data: { displayName: "Parcours du Barreau", bio, status: "ACTIVE" },
        })
      ).id;
    }
    return existing.id;
  }
  const created = await prisma.user.create({
    data: {
      email: DESK_EMAIL,
      displayName: "Parcours du Barreau",
      role: "BOTH",
      status: "ACTIVE",
      language: "fr",
      preferredCurrency: "CAD",
      country: "Canada",
      bio,
      verifiedAt: new Date(),
    },
  });
  return created.id;
}

export async function publishBarreauResources() {
  const drafts = await collectBarreauResources();
  if (!drafts.length) {
    return { ok: false as const, error: "Aucune ressource officielle avec image" };
  }

  const authorId = await deskAuthorId();
  const keys = drafts.map((draft) => draft.sourceKey);
  let created = 0;
  let updated = 0;

  for (const draft of drafts) {
    const attachmentsJson = JSON.stringify([
      { url: draft.imageUrl, contentType: "image/jpeg", name: "source.jpg" },
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
      sourceKey: { startsWith: "barreau:" },
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
    items: drafts.map((draft) => ({
      category: draft.category,
      title: draft.title,
      url: draft.sourceUrl,
    })),
  };
}
