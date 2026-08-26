import { isImageAttachment } from "@/lib/api";

export type CommunityKind = "BUSINESS" | "OPPORTUNITY" | "COMMUNITY";
export type CommunityFilter = "" | CommunityKind | "JOB" | "MEET";

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
  BUSINESS: "Affaires",
  OPPORTUNITY: "Opportunités",
  COMMUNITY: "Communauté",
  JOB: "Emplois",
  MEET: "Rencontre",
};

export const PUBLISH_KINDS: { id: CommunityKind; label: string }[] = [
  { id: "BUSINESS", label: "Affaires" },
  { id: "OPPORTUNITY", label: "Opportunités" },
  { id: "COMMUNITY", label: "Communauté" },
];

export const FILTERS: { id: CommunityFilter; label: string }[] = [
  { id: "", label: "Tout" },
  { id: "BUSINESS", label: "Affaires" },
  { id: "OPPORTUNITY", label: "Opportunités" },
  { id: "COMMUNITY", label: "Communauté" },
  { id: "JOB", label: "Emplois" },
  { id: "MEET", label: "Rencontre" },
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
  return isImageAttachment(att.url) || isImageAttachment(att.name);
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
