import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createLivekitParticipantToken,
  livekitAudioGrant,
  livekitParticipantGrant,
  livekitRoomName,
} from "./livekit";
import { TrackSource } from "livekit-server-sdk";

describe("LiveKit room + token (audio / video)", () => {
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

  it("AUDIO via livekitParticipantGrant n'inclut pas CAMERA", () => {
    const grant = livekitParticipantGrant("rfacto-call-1", "AUDIO");
    assert.deepEqual(grant.canPublishSources, [TrackSource.MICROPHONE]);
    assert.equal(grant.canPublishData, false);
  });

  it("autorise micro + caméra uniquement pour VIDEO", () => {
    const grant = livekitParticipantGrant("rfacto-call-1", "VIDEO");
    assert.deepEqual(grant.canPublishSources, [
      TrackSource.MICROPHONE,
      TrackSource.CAMERA,
    ]);
    assert.equal(grant.canPublishData, false);
    assert.equal(grant.canPublish, true);
    assert.equal(grant.canSubscribe, true);
    assert.equal(grant.roomJoin, true);
  });

  it("émet un JWT signé côté serveur, sans secret, y compris pour VIDEO", async () => {
    const token = await createLivekitParticipantToken({
      identity: "user_rfacto",
      name: "Félix",
      roomName: "rfacto-call-1",
      mediaType: "VIDEO",
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
