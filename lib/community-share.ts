import { getAppUrl } from "@/lib/app-url";
import {
  isImageAttachment,
  parseAttachmentsJson,
  type CommunityAttachment,
} from "@/lib/community";

/** Public share URL crawlers can read (OG image = post media). */
export function communitySharePath(postId: string) {
  return `/share/community/${encodeURIComponent(postId)}`;
}

export function communityShareUrl(postId: string) {
  return `${getAppUrl()}${communitySharePath(postId)}`;
}

/** Crawlable OG image — .jpg URL, not /api/media (WhatsApp/Facebook often fail those). */
export function communityOgImageUrl(postId: string, version?: number | string) {
  const base = `${getAppUrl()}/og/community/${encodeURIComponent(postId)}.jpg`;
  return version ? `${base}?v=${version}` : base;
}

export function absoluteMediaUrl(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = getAppUrl();
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

export function firstImageAttachment(
  attachments: CommunityAttachment[] | string | null | undefined
): CommunityAttachment | null {
  const list =
    typeof attachments === "string" || attachments == null
      ? parseAttachmentsJson(attachments as string | null | undefined)
      : attachments;
  return (
    list.find((a) => isImageAttachment(a.contentType, a.url || a.name)) ?? null
  );
}

export function shareExcerpt(body: string, max = 160) {
  const t = body.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export type SharePostView = {
  id: string;
  title: string | null;
  body: string;
  attachmentsJson: string;
  updatedAt: Date;
  href: string;
  author: { displayName: string; avatarUrl: string | null };
};
