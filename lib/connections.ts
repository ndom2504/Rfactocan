import { prisma } from "@/lib/prisma";

export type AuthorConnectionStats = {
  connectionCount: number;
  connectedByMe: boolean;
};

/** Batch-load follower counts + whether session follows each author. */
export async function loadAuthorConnections(
  sessionId: string,
  authorIds: string[]
): Promise<Map<string, AuthorConnectionStats>> {
  const unique = [...new Set(authorIds.filter(Boolean))];
  const map = new Map<string, AuthorConnectionStats>();
  for (const id of unique) {
    map.set(id, { connectionCount: 0, connectedByMe: false });
  }
  if (!unique.length) return map;

  try {
    const [counts, mine] = await Promise.all([
      prisma.userConnection.groupBy({
        by: ["followingId"],
        where: { followingId: { in: unique } },
        _count: { _all: true },
      }),
      prisma.userConnection.findMany({
        where: { followerId: sessionId, followingId: { in: unique } },
        select: { followingId: true },
      }),
    ]);
    const mineSet = new Set(mine.map((m) => m.followingId));
    for (const row of counts) {
      const cur = map.get(row.followingId);
      if (cur) cur.connectionCount = row._count._all;
    }
    for (const id of unique) {
      const cur = map.get(id);
      if (cur) cur.connectedByMe = mineSet.has(id);
    }
  } catch (error) {
    console.error("UserConnection query failed (table missing?):", error);
  }
  return map;
}
