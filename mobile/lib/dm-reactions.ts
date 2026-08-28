export const DM_REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;

export type ReactionSummary = {
  emoji: string;
  count: number;
  mine: boolean;
};

export function toggleReactionSummaries(
  current: ReactionSummary[],
  emoji: string
): ReactionSummary[] {
  const mine = current.find((r) => r.mine);
  let next = current.map((r) => ({ ...r }));
  if (mine) {
    next = next
      .map((r) => (r.mine ? { ...r, count: r.count - 1, mine: false } : r))
      .filter((r) => r.count > 0);
  }
  if (mine?.emoji === emoji) return next;
  const hit = next.find((r) => r.emoji === emoji);
  if (hit) {
    return next.map((r) =>
      r.emoji === emoji ? { ...r, count: r.count + 1, mine: true } : r
    );
  }
  return [...next, { emoji, count: 1, mine: true }];
}
