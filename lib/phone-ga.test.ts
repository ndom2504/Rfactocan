import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isPhonePlaceholderEmail,
  maskCanadaPhone,
  maskGabonPhone,
  normalizeAuthPhone,
  normalizeCanadaPhone,
  normalizeGabonPhone,
  phonePlaceholderEmail,
} from "./phone-auth";

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

describe("normalizeCanadaPhone", () => {
  it("accepte 10 chiffres, +1 et 1", () => {
    assert.equal(normalizeCanadaPhone("514 555 0123"), "+15145550123");
    assert.equal(normalizeCanadaPhone("+1 514-555-0123"), "+15145550123");
    assert.equal(normalizeCanadaPhone("15145550123"), "+15145550123");
  });

  it("refuse NPA invalide et numéros trop courts", () => {
    assert.equal(normalizeCanadaPhone(""), null);
    assert.equal(normalizeCanadaPhone("0145550123"), null);
    assert.equal(normalizeCanadaPhone("5550123"), null);
    assert.equal(normalizeCanadaPhone("+24107470012"), null);
  });
});

describe("normalizeAuthPhone", () => {
  it("choisit Gabon ou Canada selon le numéro, avec hint", () => {
    assert.equal(normalizeAuthPhone("07 47 00 12"), "+24107470012");
    assert.equal(normalizeAuthPhone("5145550123"), "+15145550123");
    assert.equal(normalizeAuthPhone("5145550123", "CA"), "+15145550123");
    assert.equal(normalizeAuthPhone("+24107470012", "CA"), "+24107470012");
  });
});

describe("masque et email technique", () => {
  it("masque le milieu du numéro", () => {
    assert.equal(maskGabonPhone("+24107470012"), "+241 07 •• •• 12");
    assert.equal(maskCanadaPhone("+15145550123"), "+1 514 ••• •123");
  });

  it("marque les emails techniques téléphone", () => {
    const email = phonePlaceholderEmail("+15145550123");
    assert.equal(email, "15145550123@phone.rfacto.local");
    assert.equal(isPhonePlaceholderEmail(email), true);
    assert.equal(isPhonePlaceholderEmail("a@b.com"), false);
  });
});
