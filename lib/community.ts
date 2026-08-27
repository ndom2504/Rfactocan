export const COMMUNITY_POST_KINDS = [
  "BUSINESS",
  "OPPORTUNITY",
  "COMMUNITY",
] as const;

export type CommunityPostKindId = (typeof COMMUNITY_POST_KINDS)[number];

/** Marketplace + community announcement filters. */
export const COMMUNITY_FEED_FILTERS = [
  "ANNOUNCE",
  "TRIP",
  "PARCEL",
  "SERVICE",
] as const;

export type CommunityFeedFilterId = (typeof COMMUNITY_FEED_FILTERS)[number];

export function isCommunityFeedFilter(
  value: string
): value is CommunityFeedFilterId {
  return (COMMUNITY_FEED_FILTERS as readonly string[]).includes(value);
}

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

export function guessImageContentType(url: string) {
  const hay = url.toLowerCase();
  if (hay.includes(".png")) return "image/png";
  if (hay.includes(".webp")) return "image/webp";
  if (hay.includes(".gif")) return "image/png";
  return "image/jpeg";
}

/** Reuse an existing cover/photo URL as a community attachment. */
export function attachmentFromImageUrl(
  url: string | null | undefined,
  name: string
): CommunityAttachment | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  return {
    url: trimmed.slice(0, 800),
    name: (name || "cover").slice(0, 180),
    contentType: guessImageContentType(trimmed),
    size: 0,
  };
}

export function isImageAttachment(
  contentType: string,
  nameOrUrl?: string | null
) {
  const type = (contentType || "").toLowerCase().split(";")[0]?.trim() ?? "";
  if (type.startsWith("image/")) return true;
  if (
    type.startsWith("video/") ||
    type.startsWith("audio/") ||
    type === "application/pdf"
  ) {
    return false;
  }
  // Mobile uploads often store application/octet-stream.
  const hay = (nameOrUrl || "").toLowerCase();
  return /\.(jpe?g|png|webp|gif)(\?|$)/i.test(hay);
}

export function isAudioAttachment(
  contentType?: string | null,
  nameOrUrl?: string | null
) {
  const type = (contentType || "").toLowerCase().split(";")[0]?.trim() ?? "";
  if (type.startsWith("audio/")) return true;
  const hay = decodeURIComponent(nameOrUrl || "").toLowerCase();
  if (hay.includes("voice-note")) return true;
  return /\.(m4a|aac|mp3|ogg|oga|wav|amr|3gpp|weba)(\?|#|$)/i.test(hay);
}

/** MIME the browser <audio> element can use (Android notes are AAC in MP4). */
export function guessVoiceNoteMime(
  nameOrUrl?: string | null,
  contentType?: string | null
) {
  const type = (contentType || "").toLowerCase().split(";")[0]?.trim() ?? "";
  const hay = decodeURIComponent(nameOrUrl || "").toLowerCase();
  if (type.includes("webm") || hay.includes(".webm") || hay.includes(".weba")) {
    return "audio/webm";
  }
  if (type === "audio/mpeg" || hay.includes(".mp3")) return "audio/mpeg";
  if (type.includes("ogg") || hay.includes(".ogg") || hay.includes(".oga")) {
    return "audio/ogg";
  }
  if (type.includes("wav") || hay.includes(".wav")) return "audio/wav";
  if (type.startsWith("audio/") && type !== "application/octet-stream") {
    return type;
  }
  return "audio/mp4";
}

export function isVideoAttachment(
  contentType: string,
  nameOrUrl?: string | null
) {
  if (isAudioAttachment(contentType, nameOrUrl)) return false;
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
  "image/gif",
]);

export const COMMUNITY_ALLOWED_DOCS = new Set(["application/pdf"]);

export const COMMUNITY_ALLOWED_VIDEOS = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

export const COMMUNITY_ALLOWED_AUDIOS = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/aac",
  "audio/wav",
  "audio/x-wav",
  "audio/3gpp",
  "audio/amr",
  "audio/mp4a-latm",
]);

/** Voice notes in DM / In (FormData is enough under ~4 MB). */
export const COMMUNITY_MAX_AUDIO_BYTES = 15 * 1024 * 1024;

export const COMMUNITY_MAX_IMAGE_BYTES = 50 * 1024 * 1024;
export const COMMUNITY_MAX_DOC_BYTES = 50 * 1024 * 1024;
/** Community clip limit (direct-to-Blob upload; bypasses serverless body limit). */
export const COMMUNITY_MAX_VIDEO_BYTES = 100 * 1024 * 1024;
/** Photos / files per community post or DM album. */
export const COMMUNITY_MAX_ATTACHMENTS = 10;

export function isAllowedCommunityContentType(contentType: string) {
  const type = (contentType || "").toLowerCase().split(";")[0]?.trim() ?? "";
  return (
    COMMUNITY_ALLOWED_IMAGES.has(type) ||
    COMMUNITY_ALLOWED_DOCS.has(type) ||
    COMMUNITY_ALLOWED_VIDEOS.has(type) ||
    COMMUNITY_ALLOWED_AUDIOS.has(type)
  );
}

export function maxBytesForCommunityContentType(contentType: string) {
  const type = (contentType || "").toLowerCase().split(";")[0]?.trim() ?? "";
  if (COMMUNITY_ALLOWED_IMAGES.has(type)) return COMMUNITY_MAX_IMAGE_BYTES;
  if (COMMUNITY_ALLOWED_AUDIOS.has(type) || type.startsWith("audio/")) {
    return COMMUNITY_MAX_AUDIO_BYTES;
  }
  if (COMMUNITY_ALLOWED_VIDEOS.has(type) || type.startsWith("video/")) {
    return COMMUNITY_MAX_VIDEO_BYTES;
  }
  return COMMUNITY_MAX_DOC_BYTES;
}

