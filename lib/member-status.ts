export const MEMBER_STATUS_KINDS = [
  "STORY",
  "IDEA",
  "HELP",
  "PROGRESS",
  "AVAILABLE",
] as const;

export type MemberStatusKindValue = (typeof MEMBER_STATUS_KINDS)[number];

export const MEMBER_STATUS_TTL_MS = 24 * 60 * 60 * 1000;
export const MEMBER_STATUS_VIDEO_MAX_SEC = 60;
/** Max active 24h stories per user (WhatsApp-style stack). */
export const MEMBER_STATUS_MAX_PER_USER = 10;

export function isMemberStatusKind(
  value: unknown
): value is MemberStatusKindValue {
  return (
    typeof value === "string" &&
    (MEMBER_STATUS_KINDS as readonly string[]).includes(value)
  );
}

export function memberStatusLabelFr(kind: MemberStatusKindValue) {
  switch (kind) {
    case "STORY":
      return "Story";
    case "IDEA":
      return "Une idée";
    case "HELP":
      return "Besoin d'aide";
    case "PROGRESS":
      return "J'avance";
    case "AVAILABLE":
      return "Dispo pour aider";
  }
}

export function memberStatusEmoji(kind: MemberStatusKindValue) {
  switch (kind) {
    case "STORY":
      return "✨";
    case "IDEA":
      return "💡";
    case "HELP":
      return "🤝";
    case "PROGRESS":
      return "🚀";
    case "AVAILABLE":
      return "⚡";
  }
}

export function memberStatusCommunityKind(
  kind: MemberStatusKindValue
): "OPPORTUNITY" | "COMMUNITY" | "BUSINESS" | null {
  if (kind === "AVAILABLE") return null;
  if (kind === "STORY" || kind === "PROGRESS") return "COMMUNITY";
  if (kind === "HELP" || kind === "IDEA") return "OPPORTUNITY";
  return "COMMUNITY";
}

export function memberStatusTitle(kind: MemberStatusKindValue) {
  return `${memberStatusEmoji(kind)} ${memberStatusLabelFr(kind)}`;
}

export function isAllowedMediaUrl(value: string) {
  const v = value.trim();
  if (!v) return false;
  if (v.startsWith("https://") || v.startsWith("http://")) return true;
  if (v.startsWith("/")) return true;
  return false;
}
