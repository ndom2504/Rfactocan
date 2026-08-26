/** Phone OTP helpers — Africa SMS-only, elsewhere email + SMS. */

import { getCountryName } from "@/lib/corridors";
import {
  countryFromDial,
  getPhonePlan,
  isSmsOnlyCountry,
  normalizePhoneForCountry,
  resolvePhoneCountry,
} from "@/lib/phone-countries";

export type PhoneAuthCountry = string;

export const GA_DIAL_CODE = "241";
export const PHONE_EMAIL_DOMAIN = "phone.rfacto.local";

export { isSmsOnlyCountry };

export function isPhonePlaceholderEmail(email?: string | null): boolean {
  if (!email) return true;
  return email.toLowerCase().endsWith(`@${PHONE_EMAIL_DOMAIN}`);
}

export function phonePlaceholderEmail(e164: string): string {
  return `${e164.replace(/\D/g, "")}@${PHONE_EMAIL_DOMAIN}`;
}

export function normalizeGabonPhone(input: string): string | null {
  return normalizePhoneForCountry(input, "GA");
}

export function normalizeCanadaPhone(input: string): string | null {
  return normalizePhoneForCountry(input, "CA");
}

export function normalizeAuthPhone(
  input: string,
  hint?: PhoneAuthCountry | null
): string | null {
  const trimmed = input.trim();
  const resolved = resolvePhoneCountry(hint);

  // Un +indicatif a priorité sur le pays du menu (copier-coller WhatsApp, etc.).
  if (trimmed.startsWith("+") || trimmed.startsWith("00")) {
    const iso = countryFromDial(trimmed);
    if (iso) {
      const n = normalizePhoneForCountry(trimmed, iso);
      if (n) return n;
    }
  }

  if (resolved) {
    const hinted = normalizePhoneForCountry(trimmed, resolved);
    if (hinted) return hinted;
  }

  const fromDigits = countryFromDial(trimmed);
  if (fromDigits) {
    const n = normalizePhoneForCountry(trimmed, fromDigits);
    if (n) return n;
  }

  return normalizeGabonPhone(trimmed) ?? normalizeCanadaPhone(trimmed);
}

/** Ancien stockage Gabon (+2410…) et plan 2024 (+24177…) : même ligne. */
export function phoneLookupValues(e164: string): string[] {
  const out = new Set<string>([e164]);
  const digits = e164.replace(/\D/g, "");
  if (/^241([2-9])\1\d{6}$/.test(digits)) {
    const nsn = digits.slice(3);
    out.add(`+2410${nsn[0]}${nsn.slice(2)}`);
  }
  if (/^2410[2-9]\d{6}$/.test(digits)) {
    const rest = digits.slice(4);
    out.add(`+241${rest[0]}${rest}`);
  }
  return [...out];
}

/**
 * Clés de jointure carnet ↔ membre In (suffixes + alias Gabon 07/077).
 * Un contact et un match se rejoignent s’ils partagent au moins une clé.
 */
export function phoneIndexKeys(raw: string): string[] {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return [];
  const keys = new Set<string>();

  const add = (value: string) => {
    if (!value) return;
    keys.add(value);
    if (value.length >= 7) keys.add(value.slice(-7));
    if (value.length >= 8) keys.add(value.slice(-8));
    if (value.length >= 9) keys.add(value.slice(-9));
    if (value.length >= 10) keys.add(value.slice(-10));
  };

  add(digits);

  const asE164 = (d: string) => (d ? `+${d}` : "");
  const expandE164 = (e164: string) => {
    for (const alias of phoneLookupValues(e164)) {
      add(alias.replace(/\D/g, ""));
    }
  };

  if (raw.trim().startsWith("+") || digits.length >= 10) {
    expandE164(asE164(digits));
  }
  if (/^241([2-9])\1\d{6}$/.test(digits) || /^2410[2-9]\d{6}$/.test(digits)) {
    expandE164(asE164(digits));
  }
  if (/^2410[2-9]\d{7}$/.test(digits) && digits.length === 12) {
    expandE164(`+241${digits.slice(4)}`);
  }
  if (/^0([2-9])\1\d{6}$/.test(digits) && digits.length === 9) {
    expandE164(`+241${digits.slice(1)}`);
  }
  if (/^0[2-9]\d{6}$/.test(digits) && digits.length === 8) {
    const nsn = `${digits[1]}${digits.slice(1)}`;
    expandE164(`+241${nsn}`);
  }

  return [...keys];
}

/** Clés assez longues pour éviter les collisions entre pays. */
export function phoneMatchKeys(raw: string): string[] {
  return [...new Set(phoneIndexKeys(raw).filter((key) => key.length >= 8))];
}

export function indexByPhoneKeys<T>(
  items: T[],
  phoneOf: (item: T) => string | null | undefined
): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    for (const key of phoneIndexKeys(phoneOf(item) || "")) {
      map.set(key, item);
    }
  }
  return map;
}

export function lookupByPhoneKeys<T>(
  index: Map<string, T>,
  phone: string
): T | undefined {
  for (const key of phoneIndexKeys(phone)) {
    const hit = index.get(key);
    if (hit) return hit;
  }
  return undefined;
}

/** Format E.164 pour Twilio Verify. Gabon : +2410 + 8 chiffres (077…), les opérateurs gardent souvent le 0. */
export function toTwilioE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (/^2410[2-9]\d{6}$/.test(digits) && digits.length === 11) {
    const rest = digits.slice(4);
    return `+2410${rest[0]}${rest}`;
  }
  if (/^241[2-9]\d{7}$/.test(digits) && digits.length === 11) {
    return `+2410${digits.slice(3)}`;
  }
  return phone.startsWith("+") ? phone : `+${digits}`;
}

export function countryFromE164(e164: string): PhoneAuthCountry | null {
  return countryFromDial(e164);
}

export function maskGabonPhone(e164: string): string {
  const national = e164.replace(/\D/g, "").replace(/^241/, "");
  if (national.length < 4) return e164;
  return `+241 ${national.slice(0, 2)} •• •• ${national.slice(-2)}`;
}

export function maskCanadaPhone(e164: string): string {
  const national = e164.replace(/\D/g, "").replace(/^1/, "");
  if (national.length < 4) return e164;
  return `+1 ${national.slice(0, 3)} ••• •${national.slice(-3)}`;
}

export function maskAuthPhone(e164: string): string {
  const iso = countryFromE164(e164);
  const plan = getPhonePlan(iso);
  if (iso === "CA" || iso === "US") return maskCanadaPhone(e164);
  if (iso === "GA") return maskGabonPhone(e164);
  const digits = e164.replace(/\D/g, "");
  const rest = plan ? digits.slice(plan.dial.length) : digits;
  if (rest.length < 4) return e164;
  return `+${plan?.dial ?? ""} ${rest.slice(0, 2)} ••• ${rest.slice(-2)}`;
}

export function isGabonE164(phone?: string | null): boolean {
  return Boolean(phone && normalizeGabonPhone(phone) === phone);
}

export function profileCountryName(code: PhoneAuthCountry): string {
  return getCountryName(code) || getPhonePlan(code)?.name || code;
}
