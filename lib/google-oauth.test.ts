import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EXPO_GOOGLE_PROXY_REDIRECT,
  isAllowedGoogleMobileRedirect,
} from "./google-oauth";

describe("isAllowedGoogleMobileRedirect", () => {
  it("accepts the Expo AuthSession proxy", () => {
    assert.equal(isAllowedGoogleMobileRedirect(EXPO_GOOGLE_PROXY_REDIRECT), true);
    assert.equal(
      isAllowedGoogleMobileRedirect(`${EXPO_GOOGLE_PROXY_REDIRECT}/`),
      true
    );
  });

  it("accepts the native app scheme", () => {
    assert.equal(isAllowedGoogleMobileRedirect("rfacto://oauthredirect"), true);
  });

  it("rejects arbitrary URLs", () => {
    assert.equal(isAllowedGoogleMobileRedirect("https://evil.example/cb"), false);
    assert.equal(isAllowedGoogleMobileRedirect("exp://192.168.1.5:8081"), false);
  });
});
