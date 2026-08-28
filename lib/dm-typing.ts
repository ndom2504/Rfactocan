import { prisma } from "@/lib/prisma";

export const TYPING_TTL_MS = 8_000;

type TypingState = { userId: string; at: number };

const memory = new Map<string, TypingState>();

export function setTypingMemory(
  threadId: string,
  userId: string,
  typing: boolean
) {
  if (!typing) {
    const cur = memory.get(threadId);
    if (cur?.userId === userId) memory.delete(threadId);
    return;
  }
  memory.set(threadId, { userId, at: Date.now() });
}

export function isPeerTypingMemory(threadId: string, meId: string) {
  const cur = memory.get(threadId);
  if (!cur || cur.userId === meId) return false;
  if (Date.now() - cur.at > TYPING_TTL_MS) {
    memory.delete(threadId);
    return false;
  }
  return true;
}

export function isPeerTypingRow(
  row:
    | { typingUserId?: string | null; typingAt?: Date | string | null }
    | null
    | undefined,
  meId: string
) {
  if (!row?.typingUserId || row.typingUserId === meId || !row.typingAt) {
    return false;
  }
  const at = new Date(row.typingAt).getTime();
  if (Number.isNaN(at)) return false;
  return Date.now() - at <= TYPING_TTL_MS;
}

export async function readPeerTyping(threadId: string, meId: string) {
  if (isPeerTypingMemory(threadId, meId)) return true;
  try {
    const rows = await prisma.$queryRaw<
      { typingUserId: string | null; typingAt: Date | null }[]
    >`
      SELECT "typingUserId", "typingAt"
      FROM "DirectThread"
      WHERE id = ${threadId}
      LIMIT 1
    `;
    return isPeerTypingRow(rows[0], meId);
  } catch {
    return false;
  }
}

export async function persistTyping(
  threadId: string,
  userId: string,
  typing: boolean
) {
  setTypingMemory(threadId, userId, typing);
  try {
    if (typing) {
      await prisma.$executeRaw`
        UPDATE "DirectThread"
        SET "typingUserId" = ${userId}, "typingAt" = NOW()
        WHERE id = ${threadId}
      `;
    } else {
      await prisma.$executeRaw`
        UPDATE "DirectThread"
        SET "typingUserId" = NULL, "typingAt" = NULL
        WHERE id = ${threadId} AND "typingUserId" = ${userId}
      `;
    }
  } catch (e) {
    console.error("[dm] typing persist", e);
  }
}
