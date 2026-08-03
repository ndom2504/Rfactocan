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

export function isVideoAttachment(
  contentType: string,
  nameOrUrl?: string | null
) {
  const type = (contentType || "").toLowerCase().split(";")[0]?.trim() ?? "";
  if (
    type.startsWith("video/") ||
    type === "video/mp4" ||
    type === "video/webm" ||
    type === "video/quicktime"
  ) {
    return true;
  }
  // Fallback when MIME is missing / octet-stream (common on mobile uploads).
  const hay = (nameOrUrl || "").toLowerCase();
  return /\.(mp4|webm|mov|m4v|3gp)(\?|$)/i.test(hay);
}

export const COMMUNITY_ALLOWED_IMAGES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const COMMUNITY_ALLOWED_DOCS = new Set(["application/pdf"]);

export const COMMUNITY_ALLOWED_VIDEOS = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

export const COMMUNITY_MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const COMMUNITY_MAX_DOC_BYTES = 5 * 1024 * 1024;
/** Short clips for community posts (keep within platform upload limits). */
export const COMMUNITY_MAX_VIDEO_BYTES = 25 * 1024 * 1024;

export function isAllowedCommunityContentType(contentType: string) {
  const type = (contentType || "").toLowerCase().split(";")[0]?.trim() ?? "";
  return (
    COMMUNITY_ALLOWED_IMAGES.has(type) ||
    COMMUNITY_ALLOWED_DOCS.has(type) ||
    COMMUNITY_ALLOWED_VIDEOS.has(type)
  );
}

export function maxBytesForCommunityContentType(contentType: string) {
  const type = (contentType || "").toLowerCase().split(";")[0]?.trim() ?? "";
  if (COMMUNITY_ALLOWED_IMAGES.has(type)) return COMMUNITY_MAX_IMAGE_BYTES;
  if (COMMUNITY_ALLOWED_VIDEOS.has(type) || type.startsWith("video/")) {
    return COMMUNITY_MAX_VIDEO_BYTES;
  }
  return COMMUNITY_MAX_DOC_BYTES;
}

