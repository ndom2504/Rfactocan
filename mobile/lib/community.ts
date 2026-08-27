export type CommunityKind = "BUSINESS" | "OPPORTUNITY" | "COMMUNITY";
export type CommunityFilter = "" | "TRIP" | "PARCEL" | "SERVICE";

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
  isOwner?: boolean;
  author?: CommunityAuthor;
};

export const KIND_LABELS: Record<string, string> = {
  TRIP: "Voyages",
  PARCEL: "Colis",
  SERVICE: "Services",
  BUSINESS: "Affaires",
  OPPORTUNITY: "Opportunités",
  COMMUNITY: "Communauté",
};

export const FILTERS: { id: CommunityFilter; label: string }[] = [
  { id: "", label: "Tout" },
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
  const type = (att.contentType || "").toLowerCase();
  if (type.startsWith("image/")) return true;
  const hay = `${att.url} ${att.name || ""}`.toLowerCase();
  return /\.(jpe?g|png|webp|gif)(\?|$)/i.test(hay);
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
