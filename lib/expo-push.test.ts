import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildExpoAlertMessage, isExpoPushToken } from "./expo-push";

describe("isExpoPushToken", () => {
  it("accepte les jetons Expo iOS", () => {
    assert.equal(isExpoPushToken("ExponentPushToken[abc]"), true);
    assert.equal(isExpoPushToken("ExpoPushToken[abc]"), true);
  });

  it("ignore les jetons FCM / APNs", () => {
    assert.equal(isExpoPushToken("dGVzdC1mY20tdG9rZW4tbG9uZw"), false);
    assert.equal(isExpoPushToken("a".repeat(64)), false);
  });

  it("rejette vide / null", () => {
    assert.equal(isExpoPushToken(""), false);
    assert.equal(isExpoPushToken(null), false);
  });
});

describe("buildExpoAlertMessage", () => {
  it("envoie une alerte iOS visible, sans channelId ni réveil silencieux", () => {
    const message = buildExpoAlertMessage({
      to: "ExponentPushToken[abc]",
      title: "Nouveau message",
      body: "Vous avez reçu un message.",
      data: {
        type: "DIRECT_MESSAGE",
        href: "/messages/dm/1",
        threadId: "1",
        title: "ignore",
        channelId: "rfacto_messages_v3",
      },
    });
    assert.deepEqual(message, {
      to: "ExponentPushToken[abc]",
      title: "Nouveau message",
      body: "Vous avez reçu un message.",
      sound: "default",
      priority: "high",
      badge: 1,
      data: {
        type: "DIRECT_MESSAGE",
        href: "/messages/dm/1",
        threadId: "1",
      },
    });
    assert.equal("channelId" in message, false);
    assert.equal("_contentAvailable" in message, false);
    assert.equal("interruptionLevel" in message, false);
  });
});
