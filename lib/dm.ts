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

/**
 * Same DM gates used to open a thread: MEET = mutual ACCEPTED (no KYC);
 * otherwise both must be VERIFIED and not SUSPENDED.
 */
export async function assertDirectContactAllowed(
  meId: string,
  peerId: string,
  contextType?: string | null
) {
  if (contextType === "MEET") {
    const mutual = await prisma.meetContact.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { fromUserId: meId, toUserId: peerId },
          { fromUserId: peerId, toUserId: meId },
        ],
      },
    });
    if (!mutual) {
      return {
        ok: false as const,
        error:
          "Messagerie rencontre réservée aux contacts mutuels. Envoyez une demande depuis le profil.",
        status: 403,
        code: "MEET_REQUIRED",
      };
    }
    const peerUser = await prisma.user.findUnique({
      where: { id: peerId },
      select: { status: true },
    });
    if (!peerUser || peerUser.status === "SUSPENDED") {
      return {
        ok: false as const,
        error: "Utilisateur indisponible.",
        status: 404,
        code: "ACCOUNT_UNAVAILABLE",
      };
    }
    return { ok: true as const };
  }

  return assertBothVerified(meId, peerId);
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

/** True only for the member who offers the service (listing owner / invoice provider). */
export async function userIsServiceProviderInThread(input: {
  meId: string;
  peerId: string;
  threadId: string;
  lastContextType?: string | null;
  lastContextId?: string | null;
}): Promise<boolean> {
  const { meId, peerId, threadId, lastContextType, lastContextId } = input;

  if (lastContextId) {
    try {
      const listing = await prisma.serviceListing.findUnique({
        where: { id: lastContextId },
        select: { userId: true },
      });
      if (listing) return listing.userId === meId;
    } catch (e) {
      console.error("[dm] listing lookup", e);
    }
    try {
      const pay = await prisma.servicePaymentRequest.findUnique({
        where: { id: lastContextId },
        select: { providerId: true, listingId: true },
      });
      if (pay) {
        if (pay.listingId) {
          const listing = await prisma.serviceListing.findUnique({
            where: { id: pay.listingId },
            select: { userId: true },
          });
          if (listing) return listing.userId === meId;
        }
        return pay.providerId === meId;
      }
    } catch (e) {
      console.error("[dm] payment context lookup", e);
    }
  }

  try {
    const existing = await prisma.servicePaymentRequest.findFirst({
      where: {
        OR: [
          { threadId },
          {
            OR: [
              { providerId: meId, clientId: peerId },
              { providerId: peerId, clientId: meId },
            ],
          },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: { providerId: true },
    });
    if (existing) return existing.providerId === meId;
  } catch (e) {
    console.error("[dm] payment pair lookup", e);
  }

  if (lastContextType !== "SERVICE") return false;

  try {
    const [mine, theirs] = await Promise.all([
      prisma.serviceListing.findFirst({
        where: { userId: meId },
        select: { id: true },
      }),
      prisma.serviceListing.findFirst({
        where: { userId: peerId },
        select: { id: true },
      }),
    ]);
    if (!mine) return false;
    if (!theirs) return true;
    const first = await prisma.directMessage.findFirst({
      where: { threadId },
      orderBy: { createdAt: "asc" },
      select: { senderId: true },
    });
    // The client usually writes first from the listing page.
    return Boolean(first && first.senderId !== meId);
  } catch (e) {
    console.error("[dm] provider heuristic", e);
    return false;
  }
}
