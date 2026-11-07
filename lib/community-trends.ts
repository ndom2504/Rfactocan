import { parseFeedEntries, toFrench } from "@/lib/community-news";
import { prisma } from "@/lib/prisma";

const FETCH_HEADERS = {
  Accept: "application/rss+xml, application/xml, application/atom+xml, text/xml, */*",
  "User-Agent": "RfactoCommunity/1.0 (official trends)",
  "Accept-Language": "fr-CA,fr;q=0.9",
};

const DESK_EMAIL = "trends@rfacto.local";

export type TrendLane = "emploi" | "opportunite" | "produit";

type FeedSource = { sourceName: string; url: string; kind: "rss" | "html" };

const LANE_FEEDS: Record<TrendLane, FeedSource[]> = {
  emploi: [
    {
      sourceName: "France Travail",
      url: "https://recrute.francetravail.org/handlers/offerRss.ashx?LCID=1036",
      kind: "rss",
    },
    {
      sourceName: "Banque africaine de développement",
      url: "https://www.afdb.org/fr/about-us/careers/current-vacancies",
      kind: "html",
    },
  ],
  opportunite: [
    {
      sourceName: "Banque africaine de développement",
      url: "https://www.afdb.org/fr/news-and-events/press-releases",
      kind: "html",
    },
    {
      sourceName: "Commission européenne",
      url: "https://ec.europa.eu/commission/presscorner/api/rss?language=fr",
      kind: "rss",
    },
  ],
  produit: [
    {
      sourceName: "Apple Newsroom",
      url: "https://www.apple.com/ca/fr/newsroom/rss-feed.rss",
      kind: "rss",
    },
    {
      sourceName: "Google",
      url: "https://blog.google/intl/fr-ca/rss/",
      kind: "rss",
    },
    {
      sourceName: "Microsoft",
      url: "https://news.microsoft.com/fr-ca/feed/",
      kind: "rss",
    },
  ],
};

const LANE_META: Record<TrendLane, { label: string; tag: string }> = {
  emploi: { label: "Emploi", tag: "Emploi" },
  opportunite: { label: "Opportunité", tag: "Opportunité" },
  produit: { label: "Produit", tag: "Produit" },
};

export type TrendDraft = {
  sourceKey: string;
  title: string;
  body: string;
  imageUrl: string;
  sourceUrl: string;
  lane: TrendLane;
};

export function sourceUrlFromBody(body: string) {
  const matches = body.match(/https:\/\/[^\s)]+/g);
  return matches?.[matches.length - 1] ?? "";
}

export function trendTitle(title: string) {
  return title.replace(/^\d{4}-\d+\s*[-–]\s*/, "").replace(/\s+/g, " ").trim();
}

export function youtubeThumb(text: string) {
  const id = text.match(
    /youtu(?:\.be\/|be\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/i
  )?.[1];
  if (!id) return "";
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function trendBody(input: {
  label: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  tag: string;
}) {
  const summary = input.summary
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);
  return [
    input.label,
    summary,
    "",
    `Source : ${input.sourceName}`,
    input.sourceUrl,
    `#${input.tag}`,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

function isRasterImageUrl(url: string) {
  return (
    /^https:\/\//i.test(url) &&
    /\.(?:jpe?g|png|webp)(?:[.?]|$)/i.test(url) &&
    !/\.svg(?:[.?]|$)/i.test(url) &&
    !/logo|icon|favicon|sprite/i.test(url)
  );
}

function keyFor(url: string) {
  let hash = 0;
  for (const char of url) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  return hash.toString(36);
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: FETCH_HEADERS,
    signal: AbortSignal.timeout(8_000),
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
      /content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i,
    ];
    for (const pattern of patterns) {
      const found = html.match(pattern)?.[1];
      if (found && isRasterImageUrl(found)) return found;
    }
    const img = html.match(/<img\b[^>]*\bsrc=["'](https:\/\/[^"']+\.(?:jpe?g|png|webp)[^"']*)["']/i)?.[1];
    if (img && isRasterImageUrl(img)) return img;
  } catch (error) {
    console.error("[community-trends] image", error instanceof Error ? error.message : error);
  }
  return "";
}

function absoluteUrl(href: string, base: string) {
  if (href.startsWith("https://")) return href;
  if (href.startsWith("//")) return `https:${href}`;
  try {
    return new URL(href, base).toString();
  } catch {
    return "";
  }
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function entriesFromRss(url: string, sourceName: string) {
  try {
    const xml = await fetchText(url);
    return parseFeedEntries(xml).map((entry) => ({
      ...entry,
      sourceName,
      imageUrl: isRasterImageUrl(entry.imageUrl)
        ? entry.imageUrl
        : youtubeThumb(`${entry.title} ${entry.summary}`),
    }));
  } catch (error) {
    console.error("[community-trends] feed", error instanceof Error ? error.message : error);
    return [];
  }
}

async function entriesFromHtml(url: string, sourceName: string) {
  try {
    const html = await fetchText(url);
    const origin = new URL(url).origin;
    const seen = new Set<string>();
    const entries: Array<{
      title: string;
      link: string;
      summary: string;
      imageUrl: string;
      sourceName: string;
    }> = [];
    const linkPattern =
      /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    for (const match of html.matchAll(linkPattern)) {
      const link = absoluteUrl(match[1], url);
      const title = stripTags(match[2]);
      if (!link.startsWith(origin)) continue;
      if (seen.has(link)) continue;
      if (title.length < 18 || title.length > 180) continue;
      if (/rss|facebook|twitter|linkedin|instagram|cookie|accueil/i.test(link + title)) {
        continue;
      }
      if (
        !/news-and-events|press-releases|vacancies|careers|emploi|job/i.test(link)
      ) {
        continue;
      }
      seen.add(link);
      entries.push({
        title: title.slice(0, 140),
        link,
        summary: title,
        imageUrl: "",
        sourceName,
      });
      if (entries.length >= 8) break;
    }
    return entries;
  } catch (error) {
    console.error("[community-trends] html", error instanceof Error ? error.message : error);
    return [];
  }
}

export async function collectCommunityTrends() {
  const drafts: TrendDraft[] = [];
  let lookups = 0;

  for (const lane of Object.keys(LANE_FEEDS) as TrendLane[]) {
    const meta = LANE_META[lane];
    const entries = (
      await Promise.all(
        LANE_FEEDS[lane].map((feed) =>
          feed.kind === "html"
            ? entriesFromHtml(feed.url, feed.sourceName)
            : entriesFromRss(feed.url, feed.sourceName)
        )
      )
    ).flat();
    const ranked = [...entries].sort(
      (a, b) => Number(Boolean(b.imageUrl)) - Number(Boolean(a.imageUrl))
    );
    let kept = 0;
    for (const entry of ranked) {
      if (kept >= 4) break;
      const sourceUrl = entry.link.replace(/&amp;/g, "&");
      if (!sourceUrl.startsWith("https://")) continue;
      let imageUrl = isRasterImageUrl(entry.imageUrl) ? entry.imageUrl : youtubeThumb(entry.summary);
      if (!imageUrl && lookups < 10) {
        lookups += 1;
        imageUrl = await pageImage(sourceUrl);
      }
      if (!imageUrl) continue;
      const title = trendTitle(await toFrench(entry.title));
      if (title.length < 8) continue;
      const summary = await toFrench(entry.summary || title);
      drafts.push({
        sourceKey: `trend:${lane}:${keyFor(sourceUrl)}`,
        title: title.slice(0, 140),
        imageUrl,
        sourceUrl,
        lane,
        body: trendBody({
          label: meta.label,
          summary,
          sourceName: entry.sourceName,
          sourceUrl,
          tag: meta.tag,
        }),
      });
      kept += 1;
    }
  }

  return drafts;
}

async function deskAuthorId() {
  const bio = "Emplois, opportunités et produits, avec la source officielle.";
  const existing = await prisma.user.findUnique({ where: { email: DESK_EMAIL } });
  if (existing) {
    if (existing.displayName !== "Tendances" || existing.bio !== bio) {
      return (
        await prisma.user.update({
          where: { id: existing.id },
          data: { displayName: "Tendances", bio, status: "ACTIVE" },
        })
      ).id;
    }
    return existing.id;
  }
  const created = await prisma.user.create({
    data: {
      email: DESK_EMAIL,
      displayName: "Tendances",
      role: "BOTH",
      status: "ACTIVE",
      language: "fr",
      preferredCurrency: "CAD",
      bio,
      verifiedAt: new Date(),
    },
  });
  return created.id;
}

export async function publishCommunityTrends() {
  const drafts = await collectCommunityTrends();
  if (!drafts.length) {
    return { ok: false as const, error: "Aucune tendance avec image" };
  }

  const known = await prisma.communityPost.findMany({
    where: {
      status: "OPEN",
      OR: [
        { sourceKey: { startsWith: "news:" } },
        { sourceKey: { startsWith: "opportunity:" } },
      ],
    },
    select: { body: true },
  });
  const alreadyShown = new Set(
    known.flatMap((post) => sourceUrlFromBody(post.body) ? [sourceUrlFromBody(post.body)] : [])
  );
  const fresh = drafts.filter((draft) => !alreadyShown.has(draft.sourceUrl));
  const authorId = await deskAuthorId();
  const keys = fresh.map((draft) => draft.sourceKey);
  let created = 0;
  let updated = 0;

  for (const draft of fresh) {
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
    found: fresh.length,
    created,
    updated,
    hidden,
    items: fresh.map((draft) => ({
      lane: draft.lane,
      title: draft.title,
      url: draft.sourceUrl,
    })),
  };
}
