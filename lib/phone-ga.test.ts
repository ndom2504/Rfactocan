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
import {
  allowWebGoogleAuth,
  isSmsOnlyCountry,
  normalizePhoneForCountry,
  showWebGoogleAuth,
} from "./phone-countries";

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

  it("normalise Sénégal, Côte d’Ivoire, France et Nigeria", () => {
    assert.equal(normalizePhoneForCountry("77 000 00 00", "SN"), "+221770000000");
    assert.equal(normalizePhoneForCountry("07 00 00 00 00", "CI"), "+2250700000000");
    assert.equal(normalizePhoneForCountry("06 12 34 56 78", "FR"), "+33612345678");
    assert.equal(normalizePhoneForCountry("802 000 0000", "NG"), "+2348020000000");
    assert.equal(normalizeAuthPhone("+221770000000"), "+221770000000");
  });

  it("SMS seul en Afrique, email+SMS ailleurs", () => {
    assert.equal(isSmsOnlyCountry("SN"), true);
    assert.equal(isSmsOnlyCountry("CI"), true);
    assert.equal(isSmsOnlyCountry("GA"), true);
    assert.equal(isSmsOnlyCountry("FR"), false);
    assert.equal(isSmsOnlyCountry("CA"), false);
    assert.equal(isSmsOnlyCountry("CN"), false);
  });

  it("réaffiche Google web pour le Gabon (temp Play Store)", () => {
    assert.equal(allowWebGoogleAuth("GA"), true);
    assert.equal(allowWebGoogleAuth("SN"), false);
    assert.equal(showWebGoogleAuth("GA"), true);
    assert.equal(showWebGoogleAuth("SN"), false);
    assert.equal(showWebGoogleAuth("CA"), true);
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
