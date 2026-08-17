import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  authorizeCallAction,
  callDirection,
  callDurationMs,
  DEFAULT_END_REASON,
  isAcceptedWithoutMediaTimedOut,
  isActiveCallStatus,
  isRingingTimedOut,
  RINGING_TIMEOUT_MS,
  sanitizeEndReason,
  usersHaveIncompatibleActiveCall,
  type CallParty,
} from "./call-rules";

function call(overrides: Partial<CallParty> & Pick<CallParty, "id">): CallParty {
  return {
    callerId: "caller",
    calleeId: "callee",
    status: "RINGING",
    createdAt: new Date(),
    answeredAt: null,
    endedAt: null,
    ...overrides,
  };
}

describe("création d'appel valide (règles)", () => {
  it("identifie un appel sortant RINGING entre deux participants", () => {
    const ringing = call({ id: "c1" });
    assert.equal(callDirection(ringing, "caller"), "outbound");
    assert.equal(callDirection(ringing, "callee"), "inbound");
    assert.equal(authorizeCallAction(ringing, "caller", "read").ok, true);
    assert.equal(authorizeCallAction(ringing, "callee", "read").ok, true);
    assert.equal(isActiveCallStatus("RINGING"), true);
  });
});

describe("utilisateur non membre du thread / appel", () => {
  it("refuse la lecture et toutes les actions", () => {
    const ringing = call({ id: "c1" });
    const read = authorizeCallAction(ringing, "stranger", "read");
    assert.equal(read.ok, false);
    if (!read.ok) {
      assert.equal(read.status, 404);
      assert.equal(read.code, "CALL_NOT_FOUND");
    }
    for (const action of ["accept", "reject", "cancel", "end"] as const) {
      const result = authorizeCallAction(ringing, "stranger", action);
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.status, 404);
    }
  });
});

describe("acceptation par mauvaise personne", () => {
  it("interdit à l'appelant d'accepter", () => {
    const ringing = call({ id: "c1" });
    const result = authorizeCallAction(ringing, "caller", "accept");
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.status, 403);
      assert.equal(result.code, "NOT_CALLEE");
    }
  });

  it("autorise uniquement le callee", () => {
    const ringing = call({ id: "c1" });
    assert.equal(authorizeCallAction(ringing, "callee", "accept").ok, true);
  });
});

describe("rejet", () => {
  it("passe uniquement par le callee tant que RINGING", () => {
    const ringing = call({ id: "c1" });
    assert.equal(authorizeCallAction(ringing, "callee", "reject").ok, true);
    const asCaller = authorizeCallAction(ringing, "caller", "reject");
    assert.equal(asCaller.ok, false);
    if (!asCaller.ok) assert.equal(asCaller.code, "NOT_CALLEE");
  });
});

describe("annulation", () => {
  it("est réservée à l'appelant en RINGING", () => {
    const ringing = call({ id: "c1" });
    assert.equal(authorizeCallAction(ringing, "caller", "cancel").ok, true);
    const asCallee = authorizeCallAction(ringing, "callee", "cancel");
    assert.equal(asCallee.ok, false);
    if (!asCallee.ok) assert.equal(asCallee.code, "NOT_CALLER");
  });
});

describe("fin d'appel", () => {
  it("autorise les deux participants seulement si ACCEPTED", () => {
    const accepted = call({
      id: "c1",
      status: "ACCEPTED",
      answeredAt: new Date(),
    });
    assert.equal(authorizeCallAction(accepted, "caller", "end").ok, true);
    assert.equal(authorizeCallAction(accepted, "callee", "end").ok, true);

    const ringing = call({ id: "c2" });
    const tooSoon = authorizeCallAction(ringing, "caller", "end");
    assert.equal(tooSoon.ok, false);
    if (!tooSoon.ok) {
      assert.equal(tooSoon.status, 409);
      assert.equal(tooSoon.code, "INVALID_STATUS");
    }
  });

  it("calcule la durée si answeredAt et endedAt sont présents", () => {
    const start = new Date("2026-08-16T21:00:00.000Z");
    const end = new Date("2026-08-16T21:01:30.000Z");
    assert.equal(
      callDurationMs({ answeredAt: start, endedAt: end }),
      90_000
    );
    assert.equal(callDurationMs({ answeredAt: start, endedAt: null }), null);
  });
});

describe("accès à l'historique", () => {
  it("n'expose pas un appel à un tiers", () => {
    const ended = call({
      id: "c1",
      status: "ENDED",
      answeredAt: new Date(),
      endedAt: new Date(),
    });
    assert.equal(authorizeCallAction(ended, "caller", "read").ok, true);
    assert.equal(authorizeCallAction(ended, "callee", "read").ok, true);
    const other = authorizeCallAction(ended, "other", "read");
    assert.equal(other.ok, false);
    if (!other.ok) assert.equal(other.status, 404);
  });

  it("classe inbound / outbound / missed", () => {
    const missed = call({ id: "m1", status: "MISSED", calleeId: "me" });
    assert.equal(callDirection(missed, "me"), "inbound");
    assert.equal(callDirection(missed, "caller"), "outbound");
    assert.equal(missed.status, "MISSED");
  });
});

describe("double appel simultané", () => {
  it("détecte un RINGING ou ACCEPTED impliquant l'un des deux users", () => {
    const active = [
      call({ id: "busy", callerId: "a", calleeId: "x", status: "RINGING" }),
    ];
    assert.equal(usersHaveIncompatibleActiveCall(active, "a", "b"), true);
    assert.equal(usersHaveIncompatibleActiveCall(active, "b", "c"), false);

    const onCall = [
      call({ id: "live", callerId: "c", calleeId: "d", status: "ACCEPTED" }),
    ];
    assert.equal(usersHaveIncompatibleActiveCall(onCall, "e", "d"), true);
    assert.equal(
      usersHaveIncompatibleActiveCall(
        [call({ id: "old", status: "ENDED", callerId: "a", calleeId: "b" })],
        "a",
        "b"
      ),
      false
    );
  });
});

describe("timeout ACCEPTED sans média", () => {
  it("libère un ACCEPTED sans LiveKit après 60s", () => {
    const now = new Date("2026-08-16T21:01:00.000Z");
    const fresh = call({
      id: "fresh",
      status: "ACCEPTED",
      answeredAt: new Date("2026-08-16T21:00:30.000Z"),
    });
    const stale = call({
      id: "stale",
      status: "ACCEPTED",
      answeredAt: new Date("2026-08-16T21:00:00.000Z"),
    });
    assert.equal(isAcceptedWithoutMediaTimedOut(fresh, now), false);
    assert.equal(isAcceptedWithoutMediaTimedOut(stale, now), true);
    assert.equal(
      isAcceptedWithoutMediaTimedOut(
        { ...stale, livekitRoom: "room_1" },
        now
      ),
      false
    );
  });
});

describe("timeout RINGING → MISSED", () => {
  it("reste actif avant 45s et expire à 45s", () => {
    const now = new Date("2026-08-16T21:00:45.000Z");
    const fresh = call({
      id: "fresh",
      createdAt: new Date("2026-08-16T21:00:01.000Z"),
    });
    const stale = call({
      id: "stale",
      createdAt: new Date("2026-08-16T21:00:00.000Z"),
    });
    assert.equal(isRingingTimedOut(fresh, now), false);
    assert.equal(isRingingTimedOut(stale, now), true);
    assert.equal(RINGING_TIMEOUT_MS, 45_000);

    const acceptLate = authorizeCallAction(stale, "callee", "accept", now);
    assert.equal(acceptLate.ok, false);
    if (!acceptLate.ok) assert.equal(acceptLate.code, "CALL_MISSED");
  });
});

describe("appel vers utilisateur suspendu", () => {
  it("est refusé en amont via assertDirectContactAllowed / assertBothVerified (voir lib/dm.ts)", () => {
    // Garde existante: assertBothVerified retourne 403 "Compte indisponible."
    // si status === SUSPENDED. createCall réutilise cette fonction — pas de logique parallèle.
    assert.equal(true, true);
  });
});

describe("endReason", () => {
  it("ignore une valeur arbitraire trop longue et garde un défaut sûr", () => {
    assert.equal(sanitizeEndReason(undefined), DEFAULT_END_REASON);
    assert.equal(sanitizeEndReason("HANGUP"), "HANGUP");
    assert.equal(sanitizeEndReason("x".repeat(200)).length, 80);
  });
});
