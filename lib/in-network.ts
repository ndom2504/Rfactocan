import {
  normalizeAuthPhone,
  normalizeCanadaPhone,
  normalizeGabonPhone,
} from "@/lib/phone-auth";
import {
  countryFromDial,
  normalizePhoneForCountry,
} from "@/lib/phone-countries";

const MAX_INPUT_PHONES = 400;

/** Candidate E.164 values for a single address-book number. */
export function contactPhoneCandidates(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const found = new Set<string>();

  const auth = normalizeAuthPhone(trimmed);
  const ga = normalizeGabonPhone(trimmed);
  const ca = normalizeCanadaPhone(trimmed);
  if (auth) found.add(auth);
  if (ga) found.add(ga);
  if (ca) found.add(ca);
  const iso = countryFromDial(trimmed);
  if (iso) {
    const n = normalizePhoneForCountry(trimmed, iso);
    if (n) found.add(n);
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length >= 8 && digits.length <= 15) {
    found.add(`+${digits}`);
    if (digits.startsWith("00") && digits.length >= 10) {
      found.add(`+${digits.slice(2)}`);
    }
    if (digits.length >= 10) {
      const caLast = normalizeCanadaPhone(digits.slice(-10));
      if (caLast) found.add(caLast);
    }
    if (digits.length >= 8) {
      const gaLast = normalizeGabonPhone(digits.slice(-8));
      if (gaLast) found.add(gaLast);
    }
  }
  return [...found];
}

export function flattenMatchPhones(phones: string[]): string[] {
  const out = new Set<string>();
  for (const phone of phones.slice(0, MAX_INPUT_PHONES)) {
    for (const candidate of contactPhoneCandidates(phone)) {
      out.add(candidate);
    }
  }
  return [...out];
}
