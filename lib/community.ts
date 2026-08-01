export const COMMUNITY_POST_KINDS = [
  "BUSINESS",
  "OPPORTUNITY",
  "COMMUNITY",
] as const;

export type CommunityPostKindId = (typeof COMMUNITY_POST_KINDS)[number];

export type CommunityAttachment = {
  url: string;
  name: string;
  contentType: string;
  size: number;
};

export function isCommunityPostKind(value: string): value is CommunityPostKindId {
  return (COMMUNITY_POST_KINDS as readonly string[]).includes(value);
}

export function parseAttachmentsJson(raw: string | null | undefined): CommunityAttachment[] {
  try {
    const parsed = JSON.parse(raw || "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is CommunityAttachment =>
          Boolean(
            item &&
              typeof item === "object" &&
              typeof (item as CommunityAttachment).url === "string" &&
              typeof (item as CommunityAttachment).name === "string"
          )
      )
      .map((item) => ({
        url: item.url,
        name: item.name.slice(0, 180),
        contentType: typeof item.contentType === "string" ? item.contentType : "application/octet-stream",
        size: typeof item.size === "number" ? item.size : 0,
      }));
  } catch {
    return [];
  }
}

export function isImageAttachment(contentType: string) {
  return contentType.startsWith("image/");
}
