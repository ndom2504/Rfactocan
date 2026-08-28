import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isAllowedAppReturnUrl,
  isAllowedDoneOrigin,
  isExpoGoogleSid,
  looksLikeJwt,
} from "./google-mobile-oauth";

describe("isAllowedAppReturnUrl", () => {
  it("accepts Expo Go and the app scheme", () => {
    assert.equal(
      isAllowedAppReturnUrl("exp://192.168.1.12:8081/--/oauth/google"),
      true
    );
    assert.equal(isAllowedAppReturnUrl("rfacto://oauth/google"), true);
    assert.equal(isAllowedAppReturnUrl("exps://u.expo.dev/--/oauth/google"), true);
  });

  it("rejects web URLs", () => {
    assert.equal(isAllowedAppReturnUrl("https://evil.example/steal"), false);
    assert.equal(isAllowedAppReturnUrl("https://auth.expo.io/@x/y"), false);
    assert.equal(isAllowedAppReturnUrl("javascript:alert(1)"), false);
  });
});

describe("isAllowedDoneOrigin", () => {
  it("accepts rfacto hosts", () => {
    assert.equal(isAllowedDoneOrigin("https://rfacto.com"), true);
    assert.equal(isAllowedDoneOrigin("https://www.rfacto.com"), true);
  });

  it("rejects other sites", () => {
    assert.equal(isAllowedDoneOrigin("https://evil.example"), false);
  });
});

describe("looksLikeJwt", () => {
  it("detects three-part tokens", () => {
    assert.equal(looksLikeJwt("aaaaa.bbbbb.ccccc"), true);
    assert.equal(looksLikeJwt("uuid-state"), false);
  });
});

describe("isExpoGoogleSid", () => {
  it("accepts UUID v4", () => {
    assert.equal(isExpoGoogleSid("2c9d1a7e-4b3f-4a10-9c2d-8f1e6b0a3d77"), true);
  });

  it("rejects other values", () => {
    assert.equal(isExpoGoogleSid("not-a-uuid"), false);
    assert.equal(isExpoGoogleSid(""), false);
  });
});
