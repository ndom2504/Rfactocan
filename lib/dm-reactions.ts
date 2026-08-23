export const DM_REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;

export type DmReactionEmoji = (typeof DM_REACTION_EMOJIS)[number];

export type ReactionSummary = {
  emoji: string;
  count: number;
  mine: boolean;
};

export function isDmReactionEmoji(value: string): value is DmReactionEmoji {
  return (DM_REACTION_EMOJIS as readonly string[]).includes(value);
}

function stripVariationSelector(value: string) {
  return value.replace(/\uFE0F/g, "");
}

/** Accept ❤️ and ❤ (and other VS16 variants) as the same WhatsApp emoji. */
export function canonicalDmReaction(
  value: string | null | undefined
): DmReactionEmoji | null {
  if (value == null || value === "") return null;
  if (isDmReactionEmoji(value)) return value;
  const stripped = stripVariationSelector(value);
  return (
    DM_REACTION_EMOJIS.find((emoji) => stripVariationSelector(emoji) === stripped) ??
    null
  );
}

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

export function summarizeReactions(
  rows: { messageId: string; userId: string; emoji: string }[],
  myId: string
): Record<string, ReactionSummary[]> {
  const byMessage = new Map<string, Map<string, { count: number; mine: boolean }>>();
  for (const row of rows) {
    let byEmoji = byMessage.get(row.messageId);
    if (!byEmoji) {
      byEmoji = new Map();
      byMessage.set(row.messageId, byEmoji);
    }
    const current = byEmoji.get(row.emoji) ?? { count: 0, mine: false };
    current.count += 1;
    if (row.userId === myId) current.mine = true;
    byEmoji.set(row.emoji, current);
  }
  const out: Record<string, ReactionSummary[]> = {};
  for (const [messageId, byEmoji] of byMessage) {
    out[messageId] = [...byEmoji.entries()]
      .map(([emoji, info]) => ({ emoji, count: info.count, mine: info.mine }))
      .sort((a, b) => b.count - a.count || a.emoji.localeCompare(b.emoji));
  }
  return out;
}
