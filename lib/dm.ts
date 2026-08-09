import { prisma } from "@/lib/prisma";

export type DmContextType = "SERVICE" | "JOB" | "MEET";

export function pairUserIds(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function assertBothVerified(userA: string, userB: string) {
  const users = await prisma.user.findMany({
    where: { id: { in: [userA, userB] } },
    select: { id: true, kycStatus: true, displayName: true, status: true },
  });
  if (users.length !== 2) {
    return { ok: false as const, error: "Utilisateur introuvable.", status: 404 };
  }
  for (const u of users) {
    if (u.status === "SUSPENDED") {
      return { ok: false as const, error: "Compte indisponible.", status: 403 };
    }
    if (u.kycStatus !== "VERIFIED") {
      return {
        ok: false as const,
        error:
          u.id === userA
            ? "Vérifiez votre identité pour contacter un membre."
            : "L’autre membre doit être vérifié pour la messagerie directe.",
        status: 403,
        code: "KYC_REQUIRED",
      };
    }
  }
  return { ok: true as const, users };
}

export async function getOrCreateDirectThread(input: {
  meId: string;
  peerId: string;
  contextType?: DmContextType | null;
  contextId?: string | null;
}) {
  const [userLowId, userHighId] = pairUserIds(input.meId, input.peerId);
  const existing = await prisma.directThread.findUnique({
    where: { userLowId_userHighId: { userLowId, userHighId } },
  });
  if (existing) {
    if (input.contextType || input.contextId) {
      return prisma.directThread.update({
        where: { id: existing.id },
        data: {
          ...(input.contextType
            ? { lastContextType: input.contextType }
            : {}),
          ...(input.contextId !== undefined
            ? { lastContextId: input.contextId }
            : {}),
        },
      });
    }
    return existing;
  }
  return prisma.directThread.create({
    data: {
      userLowId,
      userHighId,
      lastContextType: input.contextType ?? null,
      lastContextId: input.contextId ?? null,
    },
  });
}

export function otherUserId(
  thread: { userLowId: string; userHighId: string },
  meId: string
) {
  return thread.userLowId === meId ? thread.userHighId : thread.userLowId;
}

export async function assertThreadParticipant(
  threadId: string,
  userId: string
) {
  const thread = await prisma.directThread.findUnique({
    where: { id: threadId },
  });
  if (!thread) return null;
  if (thread.userLowId !== userId && thread.userHighId !== userId) {
    return null;
  }
  return thread;
}
