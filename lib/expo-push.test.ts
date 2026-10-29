import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isExpoPushToken } from "./expo-push";

describe("isExpoPushToken", () => {
  it("accepte les jetons Expo iOS", () => {
    assert.equal(isExpoPushToken("ExponentPushToken[abc]"), true);
  });

  it("ignore les jetons FCM / APNs", () => {
    assert.equal(isExpoPushToken("dGVzdC1mY20tdG9rZW4tbG9uZw"), false);
    assert.equal(isExpoPushToken("a".repeat(64)), false);
  });
});
