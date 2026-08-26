import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isPhonePlaceholderEmail,
  maskCanadaPhone,
  maskGabonPhone,
  normalizeAuthPhone,
  normalizeCanadaPhone,
  normalizeGabonPhone,
  phoneIndexKeys,
  phoneLookupValues,
  phonePlaceholderEmail,
  toTwilioE164,
} from "./phone-auth";
import {
  isSmsOnlyCountry,
  normalizePhoneForCountry,
  showWebGoogleAuth,
} from "./phone-countries";

describe("normalizeGabonPhone", () => {
  it("accepte le plan 2024 (077 local, +241 sans le 0) et l’ancien 07", () => {
    assert.equal(normalizeGabonPhone("077 47 00 12"), "+24177470012");
    assert.equal(normalizeGabonPhone("07 47 00 12"), "+24177470012");
    assert.equal(normalizeGabonPhone("+241 77 47 00 12"), "+24177470012");
    assert.equal(normalizeGabonPhone("+241 07 47 00 12"), "+24177470012");
    assert.equal(normalizeGabonPhone("00241077470012"), "+24177470012");
    assert.equal(normalizeGabonPhone("24107470012"), "+24177470012");
    assert.equal(normalizeGabonPhone("7470012"), "+24177470012");
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
    assert.equal(normalizeCanadaPhone("+24177470012"), null);
  });
});

describe("normalizeAuthPhone", () => {
  it("choisit Gabon ou Canada selon le numéro, avec hint", () => {
    assert.equal(normalizeAuthPhone("07 47 00 12"), "+24177470012");
    assert.equal(normalizeAuthPhone("077 47 00 12"), "+24177470012");
    assert.equal(normalizeAuthPhone("5145550123"), "+15145550123");
    assert.equal(normalizeAuthPhone("5145550123", "CA"), "+15145550123");
    assert.equal(normalizeAuthPhone("+24177470012", "CA"), "+24177470012");
    assert.equal(normalizeAuthPhone("+241 77 47 00 12", "CA"), "+24177470012");
  });

  it("normalise Sénégal, Côte d’Ivoire, France et Nigeria", () => {
    assert.equal(normalizePhoneForCountry("77 000 00 00", "SN"), "+221770000000");
    assert.equal(normalizePhoneForCountry("07 00 00 00 00", "CI"), "+2250700000000");
    assert.equal(normalizePhoneForCountry("06 12 34 56 78", "FR"), "+33612345678");
    assert.equal(normalizePhoneForCountry("802 000 0000", "NG"), "+2348020000000");
    assert.equal(normalizeAuthPhone("+221770000000"), "+221770000000");
  });

  it("email + SMS partout, plus de SMS-only Afrique", () => {
    assert.equal(isSmsOnlyCountry("SN"), false);
    assert.equal(isSmsOnlyCountry("CI"), false);
    assert.equal(isSmsOnlyCountry("GA"), false);
    assert.equal(isSmsOnlyCountry("FR"), false);
    assert.equal(isSmsOnlyCountry("CA"), false);
    assert.equal(showWebGoogleAuth("GA"), true);
    assert.equal(showWebGoogleAuth("SN"), true);
    assert.equal(showWebGoogleAuth("CA"), true);
  });
});

describe("masque et email technique", () => {
  it("masque le milieu du numéro", () => {
    assert.equal(maskGabonPhone("+24177470012"), "+241 77 •• •• 12");
    assert.equal(maskCanadaPhone("+15145550123"), "+1 514 ••• •123");
  });

  it("marque les emails techniques téléphone", () => {
    const email = phonePlaceholderEmail("+15145550123");
    assert.equal(email, "15145550123@phone.rfacto.local");
    assert.equal(isPhonePlaceholderEmail(email), true);
    assert.equal(isPhonePlaceholderEmail("a@b.com"), false);
  });

  it("relie l’ancien E.164 Gabon au plan 2024", () => {
    assert.deepEqual(phoneLookupValues("+24177470012").sort(), [
      "+24107470012",
      "+24177470012",
    ]);
    assert.equal(toTwilioE164("+24107470012"), "+241077470012");
    assert.equal(toTwilioE164("+24177470012"), "+241077470012");
  });
});

function sharesPhoneIndex(a: string, b: string) {
  const keys = new Set(phoneIndexKeys(a));
  return phoneIndexKeys(b).some((key) => keys.has(key));
}

describe("phoneIndexKeys", () => {
  it("joint un membre In Gabon à l’ancien 07 et au 077 du carnet", () => {
    assert.equal(sharesPhoneIndex("+24177470012", "07 47 00 12"), true);
    assert.equal(sharesPhoneIndex("+24177470012", "077 47 00 12"), true);
    assert.equal(sharesPhoneIndex("+24177470012", "+24107470012"), true);
    assert.equal(sharesPhoneIndex("+24177470012", "+241077470012"), true);
  });

  it("joint un numéro canadien même sans indicatif", () => {
    assert.equal(sharesPhoneIndex("+15145550123", "514-555-0123"), true);
  });
});
