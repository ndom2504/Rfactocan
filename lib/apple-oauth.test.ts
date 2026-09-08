import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  APPLE_BUNDLE_ID,
  appleAudiences,
  applePlaceholderEmail,
  formatAppleDisplayName,
  isApplePlaceholderEmail,
} from "./apple-oauth";

describe("Sign in with Apple helpers", () => {
  it("uses the iOS bundle id as audience", () => {
    assert.equal(appleAudiences().includes(APPLE_BUNDLE_ID), true);
  });

  it("formats the Apple full name", () => {
    assert.equal(
      formatAppleDisplayName({ givenName: "Amina", familyName: "N." }),
      "Amina N."
    );
    assert.equal(
      formatAppleDisplayName(null, "review@rfacto.com"),
      "review"
    );
    assert.equal(formatAppleDisplayName(null, null), "Membre Rfacto");
  });

  it("builds a technical email when Apple hides the address", () => {
    const email = applePlaceholderEmail("001234.abcd");
    assert.equal(isApplePlaceholderEmail(email), true);
    assert.match(email, /@apple\.rfacto\.local$/);
  });
});
