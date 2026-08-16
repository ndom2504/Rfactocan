export const COMMUNITY_FEED_SOURCES = [
  "service",
  "shop",
  "trip",
  "job",
  "meet",
] as const;

export type CommunityFeedSource = (typeof COMMUNITY_FEED_SOURCES)[number];

const FEED_PREFIX: Record<string, CommunityFeedSource> = {
  svc: "service",
  shop: "shop",
  trip: "trip",
  job: "job",
  meet: "meet",
};

export function parseCommunityFeedId(id: string): {
  source: CommunityFeedSource;
  sourceId: string;
} | null {
  const m = /^(svc|shop|trip|job|meet):(.+)$/.exec(id.trim());
  if (!m) return null;
  const source = FEED_PREFIX[m[1]];
  if (!source) return null;
  return { source, sourceId: m[2] };
}

export function communitySourceKey(
  source: CommunityFeedSource,
  sourceId: string
) {
  return `${source}:${sourceId}`;
}

export function isNativeCommunityPostId(id: string) {
  return !id.includes(":");
}
