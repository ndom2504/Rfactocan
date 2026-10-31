export const MEMBER_STATUS_KINDS = [
  "STORY",
  "IDEA",
  "HELP",
  "PROGRESS",
  "AVAILABLE",
] as const;

export type MemberStatusKind = (typeof MEMBER_STATUS_KINDS)[number];

export const MEMBER_STATUS_VIDEO_MAX_SEC = 60;

export type MemberStatusItem = {
  id: string;
  userId: string;
  kind: MemberStatusKind | string;
  caption?: string | null;
  mediaUrl?: string | null;
  expiresAt?: string;
  createdAt?: string;
  mine?: boolean;
  author?: {
    id?: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  };
};

export function statusLabelKey(kind: string) {
  switch ((kind || "").toUpperCase()) {
    case "STORY":
      return "status_kind_story" as const;
    case "IDEA":
      return "status_kind_idea" as const;
    case "HELP":
      return "status_kind_help" as const;
    case "PROGRESS":
      return "status_kind_progress" as const;
    case "AVAILABLE":
      return "status_kind_available" as const;
    default:
      return "status_kind_story" as const;
  }
}

export function statusEmoji(kind: string) {
  switch ((kind || "").toUpperCase()) {
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
    default:
      return "✨";
  }
}

export function isStatusVideoUrl(url?: string | null) {
  if (!url) return false;
  return /\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(url);
}
