import { attachmentFromImageUrl } from "@/lib/community";
import { prisma } from "@/lib/prisma";

const FETCH_HEADERS = {
  Accept: "application/rss+xml, application/xml, application/json, text/xml, */*",
  "User-Agent": "RfactoCommunity/1.0 (news headlines)",
};

type DeskId =
  | "nhl"
  | "nba"
  | "nfl"
  | "soccer"
  | "f1"
  | "atp"
  | "wta"
  | "tech"
  | "business";

type Desk = {
  id: DeskId;
  name: string;
  tag: string;
  email: string;
};

type Story = {
  deskId: DeskId;
  key: string;
  title: string;
  body: string;
  imageUrl?: string;
};

type Side = { name: string; score: string; logo?: string; winner?: boolean };

export const NEWS_DESKS: Desk[] = [
  { id: "nhl", name: "NHL", tag: "NHL", email: "news-nhl@rfacto.local" },
  { id: "nba", name: "NBA", tag: "NBA", email: "news-nba@rfacto.local" },
  { id: "nfl", name: "NFL", tag: "NFL", email: "news-nfl@rfacto.local" },
  { id: "soccer", name: "Soccer", tag: "Soccer", email: "news-soccer@rfacto.local" },
  { id: "f1", name: "Formule 1", tag: "F1", email: "news-f1@rfacto.local" },
  { id: "atp", name: "ATP", tag: "ATP", email: "news-atp@rfacto.local" },
  { id: "wta", name: "WTA", tag: "WTA", email: "news-wta@rfacto.local" },
  { id: "tech", name: "Tech", tag: "Tech", email: "news-tech@rfacto.local" },
  {
    id: "business",
    name: "Entrepreneuriat",
    tag: "Entrepreneuriat",
    email: "news-business@rfacto.local",
  },
];

export function stripHtml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tagText(chunk: string, tag: string) {
  const match = chunk.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? stripHtml(match[1]) : "";
}

function linkFrom(chunk: string) {
  const href = chunk.match(/<link\b[^>]*href=["']([^"']+)["']/i)?.[1];
  if (href?.startsWith("http")) return href.trim();
  const text = chunk.match(/<link\b[^>]*>([\s\S]*?)<\/link>/i)?.[1];
  const plain = stripHtml(text || "");
  return plain.startsWith("http") ? plain : "";
}

function imageFrom(chunk: string) {
  const candidates = [
    ...chunk.matchAll(/<(?:media:content|media:thumbnail|enclosure)\b[^>]*url=["']([^"']+)["'][^>]*>/gi),
    ...chunk.matchAll(/<img\b[^>]*src=["']([^"']+)["'][^>]*>/gi),
  ].map((match) => match[1]);
  return candidates.find((url) => /\.(?:jpe?g|png|webp)(?:\?|$)/i.test(url)) || "";
}

export type FeedEntry = { title: string; link: string; summary: string; imageUrl: string };

export function parseFeedEntries(xml: string): FeedEntry[] {
  const chunks = xml.split(/<(?:item|entry)\b/i).slice(1);
  const entries: FeedEntry[] = [];
  for (const chunk of chunks) {
    const title = tagText(chunk, "title");
    const link = linkFrom(chunk);
    const summary = (
      tagText(chunk, "description") ||
      tagText(chunk, "summary") ||
      tagText(chunk, "content")
    ).slice(0, 320);
    if (!title || !link) continue;
    entries.push({ title: title.slice(0, 120), link, summary, imageUrl: imageFrom(chunk) });
    if (entries.length >= 3) break;
  }
  return entries;
}

export function formatScoreStory(input: {
  desk: Desk;
  sourceName: string;
  url: string;
  state: "final" | "live" | "upcoming";
  away: Side;
  home: Side;
  key: string;
}): Story | null {
  const awayName = input.away.name.trim();
  const homeName = input.home.name.trim();
  if (!awayName || !homeName) return null;
  const imageUrl = rasterLogo(input.away.logo) || rasterLogo(input.home.logo);
  const footer = ["", `Source : ${input.sourceName}`, input.url, "", `#${input.desk.tag}`];
  if (input.state === "upcoming") {
    return {
      deskId: input.desk.id,
      key: input.key,
      title: `${awayName} – ${homeName}`.slice(0, 120),
      imageUrl,
      body: ["À l'affiche.", "", `${awayName} contre ${homeName}.`, ...footer].join("\n"),
    };
  }
  const awayScore = input.away.score.trim();
  const homeScore = input.home.score.trim();
  if ((input.away.winner || input.home.winner) && (awayScore.includes(" ") || homeScore.includes(" ") || awayScore === "" || homeScore === "")) {
    const winner = input.away.winner ? awayName : homeName;
    const loser = input.away.winner ? homeName : awayName;
    const sets = [awayScore, homeScore].filter(Boolean).join(" / ");
    return {
      deskId: input.desk.id,
      key: input.key,
      title: `${winner} bat ${loser}`.slice(0, 120),
      imageUrl,
      body: [
        "Résultat.",
        "",
        `${winner} l'emporte contre ${loser}${sets ? ` (${sets})` : ""}.`,
        ...footer,
      ].join("\n"),
    };
  }
  if (awayScore === "" || homeScore === "") return null;
  const a = Number(awayScore);
  const h = Number(homeScore);
  if (Number.isNaN(a) || Number.isNaN(h)) return null;
  const sentence =
    a === h
      ? `Match nul ${a}-${h} entre ${awayName} et ${homeName}.`
      : a > h
        ? `${awayName} ${input.state === "live" ? "est devant" : "l'emporte"} ${a}-${h} face à ${homeName}.`
        : `${homeName} ${input.state === "live" ? "est devant" : "l'emporte"} ${h}-${a} face à ${awayName}.`;
  return {
    deskId: input.desk.id,
    key: input.key,
    title: `${awayName} ${awayScore} – ${homeName} ${homeScore}`.slice(0, 120),
    imageUrl,
    body: [input.state === "live" ? "En cours." : "Résultat.", "", sentence, ...footer].join("\n"),
  };
}

function rasterLogo(url?: string) {
  if (!url) return undefined;
  return /\.(?:jpe?g|png|webp)(?:\?|$)/i.test(url) ? url : undefined;
}

function articleStory(desk: Desk, sourceName: string, entry: FeedEntry): Story {
  const title = publicTitle(entry);
  const summary = entry.summary && entry.summary !== title ? entry.summary : "À la une.";
  return {
    deskId: desk.id,
    key: `${desk.id}:${hashKey(entry.link)}`,
    title: title.slice(0, 120),
    imageUrl: entry.imageUrl || undefined,
    body: [summary, "", `Source : ${sourceName}`, entry.link, "", `#${desk.tag}`].join("\n"),
  };
}

function publicTitle(entry: FeedEntry) {
  if (!/^daily news\b/i.test(entry.title)) return entry.title;
  const cleaned = entry.summary
    .replace(/^.*?daily news\s+[^.]*?\d{4}\s+/i, "")
    .split(/\s+Yesterday\b|\s+Hier\b/i)[0]
    ?.trim();
  return cleaned || entry.title;
}

function hashKey(input: string) {
  let hash = 0;
  for (const char of input) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) | 0;
  return Math.abs(hash).toString(36);
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: FETCH_HEADERS,
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.text();
}

function desk(id: DeskId) {
  return NEWS_DESKS.find((item) => item.id === id)!;
}

function pickGames<T>(games: T[], isReady: (game: T) => boolean, limit: number) {
  const ready = games.filter(isReady);
  if (ready.length > 0) return ready.slice(-limit);
  return games.slice(0, 1);
}

async function nhlStories(): Promise<Story[]> {
  const json = (await fetchText("https://api-web.nhle.com/v1/score/now").then((text) =>
    JSON.parse(text)
  )) as { games?: Array<Record<string, unknown>> };
  const games = json.games ?? [];
  const chosen = pickGames(
    games,
    (game) => game.gameState === "OFF" || game.gameState === "FINAL" || game.gameState === "LIVE",
    2
  );
  return chosen.flatMap((game) => {
    const state =
      game.gameState === "LIVE" || game.gameState === "CRIT"
        ? "live"
        : game.gameState === "OFF" || game.gameState === "FINAL"
          ? "final"
          : "upcoming";
    const story = formatScoreStory({
      desk: desk("nhl"),
      sourceName: "NHL.com",
      url: "https://www.nhl.com/scores",
      state,
      key: `nhl:${String(game.id ?? "")}`,
      away: sideFromNhl(game.awayTeam),
      home: sideFromNhl(game.homeTeam),
    });
    return story ? [story] : [];
  });
}

function sideFromNhl(team: unknown): Side {
  const row = (team ?? {}) as {
    abbrev?: string;
    score?: number;
    logo?: string;
    name?: { default?: string; fr?: string } | string;
  };
  const name =
    typeof row.name === "string"
      ? row.name
      : row.name?.fr || row.name?.default || row.abbrev || "";
  return { name, score: row.score == null ? "" : String(row.score), logo: row.logo };
}

async function espnStories(id: DeskId, sourceName: string, path: string): Promise<Story[]> {
  const json = (await fetchText(
    `https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard`
  ).then((text) => JSON.parse(text))) as {
    events?: Array<Record<string, unknown>>;
  };
  const events = (json.events ?? []).flatMap(expandEspnEvent);
  const chosen = pickGames(events, (event) => espnState(event) !== "upcoming", 2);
  return chosen.flatMap((event) => {
    const competition = ((event.competitions as Array<Record<string, unknown>> | undefined) ?? [])[0];
    const competitors = (competition?.competitors as Array<Record<string, unknown>> | undefined) ?? [];
    const away = competitors.find((row) => row.homeAway === "away") ?? competitors[0];
    const home = competitors.find((row) => row.homeAway === "home") ?? competitors[1];
    const links = (event.links as Array<{ href?: string }> | undefined) ?? [];
    const story = formatScoreStory({
      desk: desk(id),
      sourceName,
      url: links.find((link) => link.href?.startsWith("http"))?.href || "https://www.espn.com",
      state: espnState(event),
      key: `${id}:${String(event.id ?? "")}`,
      away: sideFromEspn(away),
      home: sideFromEspn(home),
    });
    return story ? [story] : [];
  });
}

function expandEspnEvent(event: Record<string, unknown>) {
  const groupings = event.groupings as
    | Array<{
        grouping?: { slug?: string; displayName?: string };
        competitions?: Array<Record<string, unknown>>;
      }>
    | undefined;
  if (!groupings?.length) return [event];
  const singles = groupings.filter((group) =>
    /single/i.test(`${group.grouping?.slug ?? ""} ${group.grouping?.displayName ?? ""}`)
  );
  return (singles.length ? singles : groupings.slice(0, 1)).flatMap((group) =>
    (group.competitions ?? []).map((competition) => ({
      id: competition.id,
      status: competition.status,
      competitions: [competition],
      links: event.links,
    }))
  );
}

function espnState(event: Record<string, unknown>): "final" | "live" | "upcoming" {
  const status = event.status as { type?: { state?: string } } | undefined;
  if (status?.type?.state === "post") return "final";
  if (status?.type?.state === "in") return "live";
  return "upcoming";
}

function sideFromEspn(row: Record<string, unknown> | undefined): Side {
  const team = (row?.team ?? {}) as { displayName?: string; abbreviation?: string; logo?: string };
  const athlete = (row?.athlete ?? {}) as { displayName?: string };
  const lines = (row?.linescores ?? []) as Array<{ displayValue?: string; value?: number }>;
  const sets = lines
    .map((line) => line.displayValue || (line.value == null ? "" : String(line.value)))
    .filter(Boolean)
    .join(" ");
  return {
    name: team.displayName || athlete.displayName || team.abbreviation || "",
    score: row?.score != null && String(row.score) !== "" ? String(row.score) : sets,
    logo: team.logo,
    winner: row?.winner === true,
  };
}

async function feedStories(id: DeskId, sourceName: string, url: string, take = 1): Promise<Story[]> {
  const entries = parseFeedEntries(await fetchText(url)).slice(0, take);
  return entries.map((entry) => articleStory(desk(id), sourceName, entry));
}

async function collect(label: string, load: () => Promise<Story[]>, into: Story[]) {
  try {
    into.push(...(await load()));
  } catch (error) {
    console.error(`[community-news] ${label}`, error instanceof Error ? error.message : error);
  }
}

export async function collectCommunityNews(): Promise<Story[]> {
  const stories: Story[] = [];
  await collect("nhl", nhlStories, stories);
  await collect("nba", () => espnStories("nba", "ESPN · NBA", "basketball/nba"), stories);
  await collect("nfl", () => espnStories("nfl", "ESPN · NFL", "football/nfl"), stories);
  await collect(
    "soccer",
    async () => [
      ...(await espnStories("soccer", "ESPN · Premier League", "soccer/eng.1")),
      ...(await espnStories("soccer", "ESPN · Ligue des champions", "soccer/uefa.champions")),
    ],
    stories
  );
  await collect("f1", () => feedStories("f1", "Formula1.com", "https://www.formula1.com/en/latest/all.xml"), stories);
  await collect("atp", () => espnStories("atp", "ESPN · ATP", "tennis/atp"), stories);
  await collect("wta", () => espnStories("wta", "ESPN · WTA", "tennis/wta"), stories);
  await collect("apple", () => feedStories("tech", "Apple Newsroom", "https://www.apple.com/newsroom/rss-feed.rss"), stories);
  await collect("google", () => feedStories("tech", "Blog Google", "https://blog.google/rss/"), stories);
  await collect("microsoft", () => feedStories("tech", "Microsoft", "https://news.microsoft.com/feed/"), stories);
  await collect("eu", () =>
    feedStories(
      "business",
      "Commission européenne",
      "https://ec.europa.eu/commission/presscorner/api/rss?language=fr"
    )
  , stories);
  await collect("canada", () =>
    feedStories(
      "business",
      "Gouvernement du Canada",
      "https://www.canada.ca/fr/nouvelles.atom"
    )
  , stories);
  return stories.filter((story) => story.title.length > 3 && story.body.length > 20);
}

async function ensureDeskUser(item: Desk) {
  const bio = "Résultats et infos à la une, avec la source officielle.";
  const existing = await prisma.user.findUnique({ where: { email: item.email } });
  if (existing) {
    if (existing.displayName !== item.name || existing.bio !== bio) {
      return prisma.user.update({
        where: { id: existing.id },
        data: { displayName: item.name, bio, status: "ACTIVE" },
      });
    }
    return existing;
  }
  return prisma.user.create({
    data: {
      email: item.email,
      displayName: item.name,
      role: "BOTH",
      status: "ACTIVE",
      language: "fr",
      preferredCurrency: "CAD",
      bio,
      verifiedAt: new Date(),
    },
  });
}

export async function publishCommunityNews() {
  const stories = await collectCommunityNews();
  const users = new Map<DeskId, { id: string }>();
  for (const item of NEWS_DESKS) {
    if (!stories.some((story) => story.deskId === item.id)) continue;
    users.set(item.id, await ensureDeskUser(item));
  }

  let created = 0;
  let updated = 0;
  for (const story of stories) {
    const author = users.get(story.deskId);
    if (!author) continue;
    const sourceKey = `news:${story.key}`.slice(0, 180);
    const attachment = attachmentFromImageUrl(story.imageUrl, `${story.deskId}.jpg`);
    const data = {
      kind: "COMMUNITY" as const,
      title: story.title.slice(0, 120),
      body: story.body.slice(0, 4000),
      attachmentsJson: JSON.stringify(attachment ? [attachment] : []),
      status: "OPEN" as const,
    };
    const existing = await prisma.communityPost.findUnique({
      where: { sourceKey },
      select: { id: true, title: true, body: true },
    });
    if (!existing) {
      await prisma.communityPost.create({
        data: { ...data, authorId: author.id, sourceKey },
      });
      created += 1;
      continue;
    }
    if (existing.title === data.title && existing.body === data.body) continue;
    await prisma.communityPost.update({
      where: { id: existing.id },
      data: { ...data, createdAt: new Date() },
    });
    updated += 1;
  }

  return { ok: true as const, found: stories.length, created, updated };
}
