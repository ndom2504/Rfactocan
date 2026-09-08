import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  APPLE_REVIEW_EMAIL,
  APPLE_REVIEW_PHONE_CA,
  APPLE_REVIEW_PHONE_GA,
  APPLE_REVIEW_SMS_OTP,
  isAppleReviewAccount,
  isAppleReviewPhone,
} from "./review-account";

describe("compte TestFlight", () => {
  it("reconnaît l’e-mail de revue", () => {
    assert.equal(isAppleReviewAccount(APPLE_REVIEW_EMAIL), true);
    assert.equal(isAppleReviewAccount("  Review@Rfacto.com "), true);
    assert.equal(isAppleReviewAccount("autre@rfacto.com"), false);
  });

  it("reconnaît les numéros SMS de test", () => {
    assert.equal(isAppleReviewPhone(APPLE_REVIEW_PHONE_GA), true);
    assert.equal(isAppleReviewPhone("077 00 20 26"), true);
    assert.equal(isAppleReviewPhone(APPLE_REVIEW_PHONE_CA), true);
    assert.equal(isAppleReviewPhone("514 555 0123"), true);
    assert.equal(isAppleReviewPhone("+241 77 00 20 26"), true);
    assert.equal(isAppleReviewPhone("+33612345678"), false);
  });

  it("expose un code SMS à 6 chiffres", () => {
    assert.match(APPLE_REVIEW_SMS_OTP, /^\d{6}$/);
  });
});
