import { prisma } from "@/lib/prisma";
import { userSatisfiesKyc } from "@/lib/kyc-policy";

export type DmContextType = "SERVICE" | "JOB" | "MEET" | "IN";
export type DmChannel = "APP" | "IN";

export function dmChannel(contextType?: string | null): DmChannel {
  return contextType === "IN" ? "IN" : "APP";
}

export function inConversationPath(threadId: string) {
  return `/in/chat/${threadId}`;
}

export function appConversationPath(threadId: string) {
  return `/messages/dm/${threadId}`;
}

export function conversationPath(
  threadId: string,
  channel?: string | null
) {
  return channel === "IN" ? inConversationPath(threadId) : appConversationPath(threadId);
}

export function pairUserIds(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function assertBothVerified(
  userA: string,
  userB: string,
  contextCountry?: string | null
) {
  const users = await prisma.user.findMany({
    where: { id: { in: [userA, userB] } },
    select: {
      id: true,
      kycStatus: true,
      manualIdDocStatus: true,
      country: true,
      displayName: true,
      status: true,
    },
  });
  if (users.length !== 2) {
    return { ok: false as const, error: "Utilisateur introuvable.", status: 404 };
  }
  for (const u of users) {
    if (u.status === "SUSPENDED") {
      return { ok: false as const, error: "Compte indisponible.", status: 403 };
    }
    if (!userSatisfiesKyc(u, contextCountry)) {
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
 * ADMIN sender may message any non-suspended member; otherwise both must
 * be VERIFIED and not SUSPENDED.
 */
export async function assertDirectContactAllowed(
  meId: string,
  peerId: string,
  contextType?: string | null,
  contextId?: string | null
) {
  const me = await prisma.user.findUnique({
    where: { id: meId },
    select: { role: true, status: true },
  });
  if (me?.role === "ADMIN" && me.status !== "SUSPENDED") {
    const peer = await prisma.user.findUnique({
      where: { id: peerId },
      select: { status: true },
    });
    if (!peer || peer.status === "SUSPENDED") {
      return {
        ok: false as const,
        error: "Utilisateur indisponible.",
        status: 404,
        code: "ACCOUNT_UNAVAILABLE",
      };
    }
    return { ok: true as const };
  }

  if (contextType === "IN") {
    const [meUser, peerUser] = await Promise.all([
      prisma.user.findUnique({
        where: { id: meId },
        select: { status: true, phone: true },
      }),
      prisma.user.findUnique({
        where: { id: peerId },
        select: { status: true, phone: true },
      }),
    ]);
    if (!meUser || meUser.status === "SUSPENDED" || !peerUser || peerUser.status === "SUSPENDED") {
      return {
        ok: false as const,
        error: "Utilisateur indisponible.",
        status: 404,
        code: "ACCOUNT_UNAVAILABLE",
      };
    }
    if (!meUser.phone) {
      return {
        ok: false as const,
        error: "Activez In avec votre numéro pour discuter.",
        status: 403,
        code: "IN_PHONE_REQUIRED",
      };
    }
    return { ok: true as const };
  }

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

  let contextCountry: string | null = null;
  if (contextType === "SERVICE" && contextId) {
    const listing = await prisma.serviceListing.findUnique({
      where: { id: contextId },
      select: { country: true },
    });
    contextCountry = listing?.country ?? null;
  }

  return assertBothVerified(meId, peerId, contextCountry);
}

export async function getOrCreateDirectThread(input: {
  meId: string;
  peerId: string;
  contextType?: DmContextType | null;
  contextId?: string | null;
}) {
  const [userLowId, userHighId] = pairUserIds(input.meId, input.peerId);
  const channel = dmChannel(input.contextType);
  const existing = await prisma.directThread.findUnique({
    where: {
      userLowId_userHighId_channel: { userLowId, userHighId, channel },
    },
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
      channel,
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

/** Placeholder bodies used when a DM is only a file or voice note. */
export function isDmPlaceholderBody(body?: string | null) {
  const text = (body || "").trim();
  return (
    !text ||
    text === "Pièce jointe" ||
    text === "Attachment" ||
    text === "📎" ||
    text === "Note vocale" ||
    text === "Voice note"
  );
}
