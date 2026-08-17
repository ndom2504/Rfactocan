import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  androidChannelIdForType,
  androidTtlMsForType,
  FCM_CHANNEL_ALERTS,
  FCM_CHANNEL_CALLS,
  FCM_CHANNEL_JOBS,
  FCM_CHANNEL_MESSAGES,
} from "./fcm-channels";

describe("FCM Android channel routing", () => {
  it("envoie INCOMING_CALL sur rfacto_calls_v1 avec TTL 45s", () => {
    assert.equal(androidChannelIdForType("INCOMING_CALL"), FCM_CHANNEL_CALLS);
    assert.equal(androidTtlMsForType("INCOMING_CALL"), 45_000);
  });

  it("ne mélange pas les appels avec messages / jobs / alertes", () => {
    assert.equal(androidChannelIdForType("DIRECT_MESSAGE"), FCM_CHANNEL_MESSAGES);
    assert.equal(androidChannelIdForType("NEARBY_REQUEST"), FCM_CHANNEL_JOBS);
    assert.equal(androidChannelIdForType("BOOKING"), FCM_CHANNEL_ALERTS);
  });
});
