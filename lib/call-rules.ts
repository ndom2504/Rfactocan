/** Pure call control-plane rules (no Prisma, no LiveKit). */

export const CALL_MEDIA_TYPES = ["AUDIO", "VIDEO"] as const;
export type CallMediaTypeValue = (typeof CALL_MEDIA_TYPES)[number];

export const CALL_STATUSES = [
  "RINGING",
  "ACCEPTED",
  "REJECTED",
  "MISSED",
  "CANCELED",
  "ENDED",
  "FAILED",
] as const;
export type CallStatusValue = (typeof CALL_STATUSES)[number];

export const ACTIVE_CALL_STATUSES: readonly CallStatusValue[] = [
  "RINGING",
  "ACCEPTED",
];

export const CALL_ACTIONS = [
  "read",
  "accept",
  "reject",
  "cancel",
  "end",
] as const;
export type CallAction = (typeof CALL_ACTIONS)[number];

/** RINGING older than this becomes MISSED (lazy + future cron). */
export const RINGING_TIMEOUT_MS = 45_000;

/**
 * ACCEPTED with no LiveKit room: hang up so testers are not stuck
 * "already on a call" before media exists.
 */
export const ACCEPTED_NO_MEDIA_TIMEOUT_MS = 60_000;

export const DEFAULT_END_REASON = "USER_ENDED";
export const MISSED_END_REASON = "TIMEOUT";
export const STALE_NO_MEDIA_END_REASON = "STALE_NO_MEDIA";

export type CallParty = {
  id: string;
  callerId: string;
  calleeId: string;
  status: CallStatusValue;
  createdAt: Date;
  answeredAt?: Date | null;
  endedAt?: Date | null;
};

export type CallAuthResult =
  | { ok: true }
  | { ok: false; error: string; status: number; code: string };

export function isCallMediaType(value: unknown): value is CallMediaTypeValue {
  return (
    typeof value === "string" &&
    (CALL_MEDIA_TYPES as readonly string[]).includes(value)
  );
}

export function isCallStatus(value: unknown): value is CallStatusValue {
  return (
    typeof value === "string" &&
    (CALL_STATUSES as readonly string[]).includes(value)
  );
}

export function isActiveCallStatus(status: CallStatusValue) {
  return (ACTIVE_CALL_STATUSES as readonly string[]).includes(status);
}

export function isCallParticipant(call: CallParty, userId: string) {
  return call.callerId === userId || call.calleeId === userId;
}

export function callDirection(
  call: Pick<CallParty, "callerId" | "calleeId">,
  userId: string
): "inbound" | "outbound" | null {
  if (call.callerId === userId) return "outbound";
  if (call.calleeId === userId) return "inbound";
  return null;
}

export function isRingingTimedOut(
  call: Pick<CallParty, "status" | "createdAt">,
  now = new Date()
) {
  if (call.status !== "RINGING") return false;
  return now.getTime() - call.createdAt.getTime() >= RINGING_TIMEOUT_MS;
}

export function isAcceptedWithoutMediaTimedOut(
  call: Pick<CallParty, "status" | "answeredAt"> & {
    livekitRoom?: string | null;
  },
  now = new Date()
) {
  if (call.status !== "ACCEPTED") return false;
  if (call.livekitRoom) return false;
  const t0 = call.answeredAt;
  if (!t0) return false;
  return now.getTime() - t0.getTime() >= ACCEPTED_NO_MEDIA_TIMEOUT_MS;
}

/** Talk time when the call was answered and then ended. */
export function callDurationMs(
  call: Pick<CallParty, "answeredAt" | "endedAt">
): number | null {
  if (!call.answeredAt || !call.endedAt) return null;
  const ms = call.endedAt.getTime() - call.answeredAt.getTime();
  return ms >= 0 ? ms : 0;
}

export function usersHaveIncompatibleActiveCall(
  active: Array<Pick<CallParty, "callerId" | "calleeId" | "status">>,
  userA: string,
  userB: string
) {
  const involved = new Set([userA, userB]);
  return active.some(
    (call) =>
      isActiveCallStatus(call.status) &&
      (involved.has(call.callerId) || involved.has(call.calleeId))
  );
}

export function authorizeCallAction(
  call: CallParty,
  userId: string,
  action: CallAction,
  now = new Date()
): CallAuthResult {
  if (!isCallParticipant(call, userId)) {
    return {
      ok: false,
      error: "Appel introuvable.",
      status: 404,
      code: "CALL_NOT_FOUND",
    };
  }

  if (action === "read") return { ok: true };

  const timedOut = isRingingTimedOut(call, now);

  if (action === "accept") {
    if (call.calleeId !== userId) {
      return {
        ok: false,
        error: "Seul le destinataire peut accepter cet appel.",
        status: 403,
        code: "NOT_CALLEE",
      };
    }
    if (timedOut || call.status !== "RINGING") {
      return {
        ok: false,
        error: timedOut
          ? "Appel manqué."
          : "Cet appel n'est plus en sonnerie.",
        status: 409,
        code: timedOut ? "CALL_MISSED" : "INVALID_STATUS",
      };
    }
    return { ok: true };
  }

  if (action === "reject") {
    if (call.calleeId !== userId) {
      return {
        ok: false,
        error: "Seul le destinataire peut refuser cet appel.",
        status: 403,
        code: "NOT_CALLEE",
      };
    }
    if (timedOut || call.status !== "RINGING") {
      return {
        ok: false,
        error: timedOut
          ? "Appel manqué."
          : "Cet appel n'est plus en sonnerie.",
        status: 409,
        code: timedOut ? "CALL_MISSED" : "INVALID_STATUS",
      };
    }
    return { ok: true };
  }

  if (action === "cancel") {
    if (call.callerId !== userId) {
      return {
        ok: false,
        error: "Seul l'appelant peut annuler cet appel.",
        status: 403,
        code: "NOT_CALLER",
      };
    }
    if (timedOut || call.status !== "RINGING") {
      return {
        ok: false,
        error: timedOut
          ? "Appel manqué."
          : "Cet appel n'est plus en sonnerie.",
        status: 409,
        code: timedOut ? "CALL_MISSED" : "INVALID_STATUS",
      };
    }
    return { ok: true };
  }

  if (action === "end") {
    if (call.status !== "ACCEPTED") {
      return {
        ok: false,
        error: "Cet appel n'est pas en cours.",
        status: 409,
        code: "INVALID_STATUS",
      };
    }
    return { ok: true };
  }

  return {
    ok: false,
    error: "Action non autorisée.",
    status: 403,
    code: "FORBIDDEN",
  };
}

export function sanitizeEndReason(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_END_REASON;
  const trimmed = value.trim().slice(0, 80);
  return trimmed || DEFAULT_END_REASON;
}
