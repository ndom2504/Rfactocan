import type { Call, CallStatus, Prisma } from "@prisma/client";
import {
  assertDirectContactAllowed,
  assertThreadParticipant,
  otherUserId,
} from "@/lib/dm";
import { FCM_CHANNEL_CALLS } from "@/lib/fcm-channels";
import {
  createLivekitParticipantToken,
  getLivekitConfig,
  livekitRoomName,
} from "@/lib/livekit";
import { notifyUser } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import {
  ACTIVE_CALL_STATUSES,
  ACCEPTED_NO_MEDIA_TIMEOUT_MS,
  authorizeCallAction,
  callDirection,
  callDurationMs,
  isRingingTimedOut,
  MISSED_END_REASON,
  RINGING_TIMEOUT_MS,
  sanitizeEndReason,
  STALE_NO_MEDIA_END_REASON,
  type CallAction,
  type CallMediaTypeValue,
} from "@/lib/call-rules";

export {
  RINGING_TIMEOUT_MS,
  ACTIVE_CALL_STATUSES,
} from "@/lib/call-rules";

const peerSelect = {
  id: true,
  displayName: true,
  avatarUrl: true,
} as const;

export type CallError = {
  ok: false;
  error: string;
  status: number;
  code?: string;
};

const activeStatusFilter = {
  in: [...ACTIVE_CALL_STATUSES] as CallStatus[],
};

function fail(
  error: string,
  status: number,
  code?: string
): CallError {
  return { ok: false, error, status, code };
}

function ringingCutoff(now = new Date()) {
  return new Date(now.getTime() - RINGING_TIMEOUT_MS);
}

/**
 * RINGING older than 45s → MISSED.
 *
 * Applied lazily on every call read/write so a cron is not required yet.
 *
 * Cron (not wired — reuse existing Vercel Cron + CRON_SECRET, no extra infra):
 *   1. Add app/api/cron/expire-calls/route.ts (copy auth from expire-payments)
 *   2. Call markMissedRingingCalls()
 *   3. vercel.json: { "path": "/api/cron/expire-calls", "schedule": "* * * * *" }
 */
export async function markMissedRingingCalls(now = new Date()) {
  return prisma.call.updateMany({
    where: {
      status: "RINGING",
      createdAt: { lte: ringingCutoff(now) },
    },
    data: {
      status: "MISSED",
      endedAt: now,
      endReason: MISSED_END_REASON,
    },
  });
}

function acceptedNoMediaCutoff(now = new Date()) {
  return new Date(now.getTime() - ACCEPTED_NO_MEDIA_TIMEOUT_MS);
}

/** ACCEPTED with no LiveKit room must not block the next test call. */
export async function markStaleAcceptedCalls(now = new Date()) {
  return prisma.call.updateMany({
    where: {
      status: "ACCEPTED",
      livekitRoom: null,
      answeredAt: { lte: acceptedNoMediaCutoff(now) },
    },
    data: {
      status: "ENDED",
      endedAt: now,
      endReason: STALE_NO_MEDIA_END_REASON,
    },
  });
}

export async function expireInactiveCalls(now = new Date()) {
  await markMissedRingingCalls(now);
  await markStaleAcceptedCalls(now);
}

async function persistMissedIfStale(call: Call, now = new Date()): Promise<Call> {
  if (!isRingingTimedOut(call, now)) return call;
  return prisma.call.update({
    where: { id: call.id },
    data: {
      status: "MISSED",
      endedAt: now,
      endReason: MISSED_END_REASON,
    },
  });
}

const callWithPeers = {
  caller: { select: peerSelect },
  callee: { select: peerSelect },
} satisfies Prisma.CallInclude;

type CallWithPeers = Prisma.CallGetPayload<{ include: typeof callWithPeers }>;

export function serializeCall(call: CallWithPeers | Call, userId: string) {
  const row = call as CallWithPeers;
  const peer =
    "caller" in row && row.caller && "callee" in row && row.callee
      ? row.callerId === userId
        ? row.callee
        : row.caller
      : undefined;

  return {
    id: call.id,
    threadId: call.threadId,
    callerId: call.callerId,
    calleeId: call.calleeId,
    mediaType: call.mediaType,
    status: call.status,
    livekitRoom: call.livekitRoom,
    startedAt: call.startedAt,
    answeredAt: call.answeredAt,
    endedAt: call.endedAt,
    endReason: call.endReason,
    createdAt: call.createdAt,
    updatedAt: call.updatedAt,
    direction: callDirection(call, userId),
    durationMs: callDurationMs(call),
    missed: call.status === "MISSED",
    ...(peer ? { peer } : {}),
  };
}

export async function createCall(input: {
  userId: string;
  threadId: string;
  mediaType: CallMediaTypeValue;
}) {
  const thread = await assertThreadParticipant(input.threadId, input.userId);
  if (!thread) {
    return fail("Conversation introuvable.", 404, "THREAD_NOT_FOUND");
  }

  const calleeId = otherUserId(thread, input.userId);
  if (!calleeId || calleeId === input.userId) {
    return fail("Destinataire invalide.", 400, "INVALID_CALLEE");
  }

  const allowed = await assertDirectContactAllowed(
    input.userId,
    calleeId,
    thread.lastContextType
  );
  if (!allowed.ok) {
    return fail(allowed.error, allowed.status, "code" in allowed ? allowed.code : undefined);
  }

  const now = new Date();
  await expireInactiveCalls(now);

  const pairKey = `${thread.userLowId}:${thread.userHighId}`;

  try {
    const created = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${pairKey}))`;

      await tx.call.updateMany({
        where: {
          status: "ACCEPTED",
          livekitRoom: null,
          OR: [
            { callerId: { in: [input.userId, calleeId] } },
            { calleeId: { in: [input.userId, calleeId] } },
          ],
        },
        data: {
          status: "ENDED",
          endedAt: now,
          endReason: STALE_NO_MEDIA_END_REASON,
        },
      });

      const busy = await tx.call.findFirst({
        where: {
          status: activeStatusFilter,
          OR: [
            { callerId: { in: [input.userId, calleeId] } },
            { calleeId: { in: [input.userId, calleeId] } },
          ],
        },
        select: { id: true },
      });
      if (busy) {
        throw Object.assign(new Error("CALL_IN_PROGRESS"), { code: "CALL_IN_PROGRESS" });
      }

      const created = await tx.call.create({
        data: {
          threadId: thread.id,
          callerId: input.userId,
          calleeId,
          mediaType: input.mediaType,
          status: "RINGING",
        },
      });

      return tx.call.update({
        where: { id: created.id },
        data: { livekitRoom: livekitRoomName(created.id) },
        include: callWithPeers,
      });
    });

    const callerName = created.caller.displayName?.trim() || "Un membre";
    void notifyUser({
      userId: created.calleeId,
      type: "INCOMING_CALL",
      title: "Appel entrant",
      body: callerName,
      href: `/messages/dm/${created.threadId}`,
      data: {
        callId: created.id,
        threadId: created.threadId,
        mediaType: String(created.mediaType),
        callerId: created.callerId,
        callerName,
        channelId: FCM_CHANNEL_CALLS,
      },
    });

    return { ok: true as const, call: serializeCall(created, input.userId) };
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "CALL_IN_PROGRESS"
    ) {
      return fail(
        "Un appel est déjà en cours.",
        409,
        "CALL_IN_PROGRESS"
      );
    }
    throw error;
  }
}

export async function getCallForUser(callId: string, userId: string) {
  const existing = await prisma.call.findUnique({
    where: { id: callId },
  });
  if (
    !existing ||
    (existing.callerId !== userId && existing.calleeId !== userId)
  ) {
    return fail("Appel introuvable.", 404, "CALL_NOT_FOUND");
  }

  await persistMissedIfStale(existing);
  await markStaleAcceptedCalls();

  const call = await prisma.call.findUnique({
    where: { id: existing.id },
    include: callWithPeers,
  });
  if (!call) return fail("Appel introuvable.", 404, "CALL_NOT_FOUND");
  return { ok: true as const, call: serializeCall(call, userId) };
}

export async function listCallsForUser(input: {
  userId: string;
  limit: number;
  cursor?: string | null;
  direction?: "inbound" | "outbound" | null;
  status?: CallStatus | null;
  threadId?: string | null;
}) {
  await expireInactiveCalls();

  if (input.threadId) {
    const thread = await assertThreadParticipant(input.threadId, input.userId);
    if (!thread) {
      return fail("Conversation introuvable.", 404, "THREAD_NOT_FOUND");
    }
  }

  const where: Prisma.CallWhereInput =
    input.direction === "inbound"
      ? { calleeId: input.userId }
      : input.direction === "outbound"
        ? { callerId: input.userId }
        : {
            OR: [{ callerId: input.userId }, { calleeId: input.userId }],
          };
  if (input.status) where.status = input.status;
  if (input.threadId) where.threadId = input.threadId;

  if (input.cursor) {
    const cursorCall = await prisma.call.findUnique({
      where: { id: input.cursor },
      select: { id: true, createdAt: true, callerId: true, calleeId: true },
    });
    if (
      cursorCall &&
      (cursorCall.callerId === input.userId ||
        cursorCall.calleeId === input.userId)
    ) {
      where.AND = [
        {
          OR: [
            { createdAt: { lt: cursorCall.createdAt } },
            { createdAt: cursorCall.createdAt, id: { lt: cursorCall.id } },
          ],
        },
      ];
    }
  }

  const take = Math.min(Math.max(input.limit, 1), 100);
  const rows = await prisma.call.findMany({
    where,
    include: callWithPeers,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
  });
  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;

  return {
    ok: true as const,
    calls: page.map((call) => serializeCall(call, input.userId)),
    nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
  };
}

async function transitionCall(input: {
  callId: string;
  userId: string;
  action: CallAction;
  endReason?: unknown;
}) {
  const existing = await prisma.call.findUnique({
    where: { id: input.callId },
  });
  if (
    !existing ||
    (existing.callerId !== input.userId && existing.calleeId !== input.userId)
  ) {
    return fail("Appel introuvable.", 404, "CALL_NOT_FOUND");
  }

  const now = new Date();
  const auth = authorizeCallAction(existing, input.userId, input.action, now);
  if (isRingingTimedOut(existing, now)) {
    await persistMissedIfStale(existing, now);
  }
  if (!auth.ok) return auth;

  const data: Prisma.CallUpdateInput =
    input.action === "accept"
      ? {
          status: "ACCEPTED",
          answeredAt: now,
          startedAt: now,
        }
      : input.action === "reject"
        ? {
            status: "REJECTED",
            endedAt: now,
            endReason: "REJECTED",
          }
        : input.action === "cancel"
          ? {
              status: "CANCELED",
              endedAt: now,
              endReason: "CANCELED",
            }
          : {
              status: "ENDED",
              endedAt: now,
              endReason: sanitizeEndReason(input.endReason),
            };

  const updated = await prisma.call.update({
    where: { id: existing.id },
    data,
    include: callWithPeers,
  });

  return { ok: true as const, call: serializeCall(updated, input.userId) };
}

export async function acceptCall(callId: string, userId: string) {
  return transitionCall({ callId, userId, action: "accept" });
}

export async function rejectCall(callId: string, userId: string) {
  return transitionCall({ callId, userId, action: "reject" });
}

export async function cancelCall(callId: string, userId: string) {
  return transitionCall({ callId, userId, action: "cancel" });
}

export async function endCall(
  callId: string,
  userId: string,
  endReason?: unknown
) {
  return transitionCall({ callId, userId, action: "end", endReason });
}

export async function issueCallLivekitToken(callId: string, userId: string) {
  const existing = await prisma.call.findUnique({
    where: { id: callId },
  });
  if (
    !existing ||
    (existing.callerId !== userId && existing.calleeId !== userId)
  ) {
    return fail("Appel introuvable.", 404, "CALL_NOT_FOUND");
  }

  const now = new Date();
  await persistMissedIfStale(existing, now);

  const call = await prisma.call.findUnique({ where: { id: existing.id } });
  if (!call) return fail("Appel introuvable.", 404, "CALL_NOT_FOUND");

  if (call.status !== "ACCEPTED") {
    const ended =
      call.status === "ENDED" ||
      call.status === "REJECTED" ||
      call.status === "CANCELED" ||
      call.status === "MISSED" ||
      call.status === "FAILED";
    return fail(
      ended ? "Cet appel est terminé." : "L'appel n'est pas encore accepté.",
      409,
      ended ? "CALL_ENDED" : "CALL_NOT_ACCEPTED"
    );
  }

  const config = getLivekitConfig();
  if (!config) {
    return fail(
      "L'infrastructure d'appel n'est pas configurée.",
      503,
      "LIVEKIT_NOT_CONFIGURED"
    );
  }

  let roomName = call.livekitRoom?.trim() || "";
  if (!roomName) {
    roomName = livekitRoomName(call.id);
    await prisma.call.update({
      where: { id: call.id },
      data: { livekitRoom: roomName },
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { displayName: true },
  });

  const token = await createLivekitParticipantToken({
    identity: userId,
    name: user?.displayName?.trim() || userId,
    roomName,
    config,
  });

  return {
    ok: true as const,
    livekitUrl: config.url,
    token,
    roomName,
  };
}
