export type CommunityKind = "BUSINESS" | "OPPORTUNITY" | "COMMUNITY";
export type CommunityFilter = "" | "ANNOUNCE" | "TRIP" | "PARCEL" | "SERVICE";

export type CommunityAttachment = {
  url: string;
  name: string;
  contentType: string;
  size: number;
};

export type CommunityAuthor = {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  country?: string | null;
  verified?: boolean;
  bio?: string | null;
  connectionCount?: number;
  connectedByMe?: boolean;
};

export type CommunityPost = {
  id: string;
  kind: string;
  title?: string | null;
  body: string;
  attachments?: CommunityAttachment[];
  createdAt: string;
  href?: string | null;
  source?: string;
  commentCount?: number;
  viewCount?: number;
  isOwner?: boolean;
  author?: CommunityAuthor;
};

export const KIND_LABELS: Record<string, string> = {
  ANNOUNCE: "Annonces",
  TRIP: "Voyages",
  PARCEL: "Colis",
  SERVICE: "Services",
  BUSINESS: "Communiqué",
  OPPORTUNITY: "Événement",
  COMMUNITY: "Annonce",
};

export const PUBLISH_KINDS: { id: CommunityKind; label: string }[] = [
  { id: "COMMUNITY", label: "Annonce" },
  { id: "OPPORTUNITY", label: "Événement" },
  { id: "BUSINESS", label: "Communiqué" },
];

export const FILTERS: { id: CommunityFilter; label: string }[] = [
  { id: "", label: "Tout" },
  { id: "ANNOUNCE", label: "Annonces" },
  { id: "TRIP", label: "Voyages" },
  { id: "PARCEL", label: "Colis" },
  { id: "SERVICE", label: "Services" },
];

export function isNativeCommunityPostId(id: string) {
  return !id.includes(":");
}

export function attachmentIsImage(att: {
  url: string;
  contentType?: string;
  name?: string;
}) {
  const type = (att.contentType || "").toLowerCase().split(";")[0]?.trim() ?? "";
  if (type.startsWith("video/") || type.startsWith("audio/") || type === "application/pdf") {
    return false;
  }
  if (type.startsWith("image/")) return true;
  const hay = `${att.url} ${att.name || ""}`.toLowerCase();
  return /\.(jpe?g|png|webp|gif)(\?|$)/i.test(hay);
}

export function attachmentIsVideo(att: {
  url: string;
  contentType?: string;
  name?: string;
}) {
  const type = (att.contentType || "").toLowerCase().split(";")[0]?.trim() ?? "";
  if (type.startsWith("video/")) return true;
  const hay = `${att.url} ${att.name || ""}`.toLowerCase();
  if (/\.(m4a|aac|mp3|ogg|wav)(\?|$)/i.test(hay)) return false;
  return /\.(mp4|webm|mov|m4v|3gp)(\?|$)/i.test(hay);
}

export function postMatchesQuery(post: CommunityPost, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [
    post.title,
    post.body,
    post.author?.displayName,
    post.kind,
    KIND_LABELS[post.kind],
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(q);
}
