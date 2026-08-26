import {
  normalizeAuthPhone,
  normalizeCanadaPhone,
  normalizeGabonPhone,
  phoneLookupValues,
  phoneMatchKeys,
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
    if (digits.length >= 9) {
      const gaNine = normalizeGabonPhone(digits.slice(-9));
      if (gaNine) found.add(gaNine);
    }
  }
  const expanded = new Set<string>();
  for (const value of found) {
    for (const alias of phoneLookupValues(value)) expanded.add(alias);
  }
  return [...expanded];
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

export function sanitizeMatchPhones(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of input) {
    if (typeof value !== "string") continue;
    const raw = value.trim();
    if (raw.replace(/\D/g, "").length < 6) continue;
    if (seen.has(raw)) continue;
    seen.add(raw);
    out.push(raw.slice(0, 64));
    if (out.length >= MAX_INPUT_PHONES) break;
  }
  return out;
}

export type InDirectoryUser = {
  id: string;
  phone: string | null;
};

/** Relie chaque numéro du carnet aux membres In, y compris 07 vs 077 Gabon. */
export function matchDirectoryUsers<T extends InDirectoryUser>(
  contactPhones: string[],
  users: T[]
): Array<{ user: T; phone: string }> {
  const inputs = sanitizeMatchPhones(contactPhones).map((raw) => ({
    raw,
    keys: phoneMatchKeys(raw),
  }));
  const keyToRaws = new Map<string, string[]>();
  for (const input of inputs) {
    for (const key of input.keys) {
      const list = keyToRaws.get(key) ?? [];
      list.push(input.raw);
      keyToRaws.set(key, list);
    }
  }

  const rows: Array<{ user: T; phone: string }> = [];
  for (const user of users) {
    if (!user.phone) continue;
    const matched = new Set<string>();
    for (const key of phoneMatchKeys(user.phone)) {
      for (const raw of keyToRaws.get(key) ?? []) matched.add(raw);
    }
    if (matched.size === 0) continue;
    let count = 0;
    for (const phone of matched) {
      rows.push({ user, phone });
      count += 1;
      if (count >= 5) break;
    }
  }
  return rows;
}
