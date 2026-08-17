import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createLivekitParticipantToken,
  livekitAudioGrant,
  livekitRoomName,
} from "./livekit";
import { TrackSource } from "livekit-server-sdk";

describe("LiveKit room + token (audio only)", () => {
  it("nomme la room à partir du callId, jamais du nom d'utilisateur", () => {
    assert.equal(livekitRoomName("clxyz"), "rfacto-call-clxyz");
    assert.equal(livekitRoomName("Alice"), "rfacto-call-Alice");
  });

  it("n'accorde que le micro, pas la caméra ni le data", () => {
    const grant = livekitAudioGrant("rfacto-call-1");
    assert.equal(grant.roomJoin, true);
    assert.equal(grant.canPublish, true);
    assert.equal(grant.canSubscribe, true);
    assert.equal(grant.canPublishData, false);
    assert.deepEqual(grant.canPublishSources, [TrackSource.MICROPHONE]);
    assert.equal(grant.room, "rfacto-call-1");
  });

  it("émet un JWT signé côté serveur", async () => {
    const token = await createLivekitParticipantToken({
      identity: "user_rfacto",
      name: "Félix",
      roomName: "rfacto-call-1",
      config: {
        url: "wss://example.livekit.cloud",
        apiKey: "devkey",
        apiSecret: "secretsecretsecretsecretsecretee",
      },
    });
    assert.equal(token.split(".").length, 3);
    assert.equal(token.includes("secretsecret"), false);
  });
});
