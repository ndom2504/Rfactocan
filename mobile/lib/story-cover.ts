import { type MemberStatusGroup, type MemberStatusItem } from "@/lib/member-status";

/** Card cover = most recent story so new posts (photo/video/annonce) always show. */
export function storyCoverItem(group: MemberStatusGroup | null | undefined): MemberStatusItem | null {
  const items = group?.items ?? [];
  if (!items.length) return group?.featured ?? null;
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i]!;
    if (it.mediaUrl) return it;
  }
  return group?.featured ?? null;
}
