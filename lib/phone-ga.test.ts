import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isPhonePlaceholderEmail,
  maskGabonPhone,
  normalizeGabonPhone,
  phonePlaceholderEmail,
} from "./phone-ga";

describe("normalizeGabonPhone", () => {
  it("accepte 07 local, +241 et 00241", () => {
    assert.equal(normalizeGabonPhone("07 47 00 12"), "+24107470012");
    assert.equal(normalizeGabonPhone("+241 07 47 00 12"), "+24107470012");
    assert.equal(normalizeGabonPhone("0024107470012"), "+24107470012");
    assert.equal(normalizeGabonPhone("24107470012"), "+24107470012");
    assert.equal(normalizeGabonPhone("7470012"), "+24107470012");
  });

  it("refuse les numéros hors Gabon ou trop courts", () => {
    assert.equal(normalizeGabonPhone(""), null);
    assert.equal(normalizeGabonPhone("0612345678"), null);
    assert.equal(normalizeGabonPhone("+33612345678"), null);
    assert.equal(normalizeGabonPhone("01 23 45 67"), null);
    assert.equal(normalizeGabonPhone("0747"), null);
  });
});

describe("masque et email technique", () => {
  it("masque le milieu du numéro", () => {
    assert.equal(maskGabonPhone("+24107470012"), "+241 07 •• •• 12");
  });

  it("marque les emails techniques téléphone", () => {
    const email = phonePlaceholderEmail("+24107470012");
    assert.equal(email, "24107470012@phone.rfacto.local");
    assert.equal(isPhonePlaceholderEmail(email), true);
    assert.equal(isPhonePlaceholderEmail("a@b.com"), false);
  });
});
