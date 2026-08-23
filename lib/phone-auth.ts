/** Phone OTP helpers — Africa SMS-only, elsewhere email + SMS. */

import { getCountryName } from "@/lib/corridors";
import {
  countryFromDial,
  getPhonePlan,
  isSmsOnlyCountry,
  normalizePhoneForCountry,
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
  if (hint) {
    const hinted = normalizePhoneForCountry(trimmed, hint);
    if (hinted) return hinted;
  }
  if (trimmed.startsWith("+") || trimmed.startsWith("00")) {
    const iso = countryFromDial(trimmed);
    if (iso) {
      const n = normalizePhoneForCountry(trimmed, iso);
      if (n) return n;
    }
  }
  return normalizeGabonPhone(trimmed) ?? normalizeCanadaPhone(trimmed);
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
