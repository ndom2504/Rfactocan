/** Phone OTP helpers for Gabon (+241) and Canada (+1). */

export type PhoneAuthCountry = "GA" | "CA";

export const GA_DIAL_CODE = "241";
export const PHONE_EMAIL_DOMAIN = "phone.rfacto.local";

export function isPhonePlaceholderEmail(email?: string | null): boolean {
  if (!email) return true;
  return email.toLowerCase().endsWith(`@${PHONE_EMAIL_DOMAIN}`);
}

export function phonePlaceholderEmail(e164: string): string {
  return `${e164.replace(/\D/g, "")}@${PHONE_EMAIL_DOMAIN}`;
}

/** Normalize a Gabon mobile input to +2410xxxxxxx, or null if invalid. */
export function normalizeGabonPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (!digits) return null;

  let national = digits;
  if (national.startsWith("00241")) national = national.slice(5);
  else if (national.startsWith("241")) national = national.slice(3);

  if (national.length === 7 && /^[2-9]/.test(national)) {
    national = `0${national}`;
  }
  if (national.length !== 8) return null;
  if (!/^0[2-9]\d{6}$/.test(national)) return null;
  return `+241${national}`;
}

/** NANP Canada: +1 + 10 digits (NPA/NXX cannot start with 0 or 1). */
export function normalizeCanadaPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (!digits) return null;

  let national = digits;
  if (national.startsWith("001")) national = national.slice(3);
  else if (national.startsWith("1") && national.length === 11) {
    national = national.slice(1);
  }

  if (national.length !== 10) return null;
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(national)) return null;
  return `+1${national}`;
}

export function normalizeAuthPhone(
  input: string,
  hint?: PhoneAuthCountry | null
): string | null {
  const ga = normalizeGabonPhone(input);
  const ca = normalizeCanadaPhone(input);
  if (hint === "CA") return ca ?? ga;
  if (hint === "GA") return ga ?? ca;
  return ga ?? ca;
}

export function countryFromE164(e164: string): PhoneAuthCountry | null {
  if (e164.startsWith("+241")) return "GA";
  if (e164.startsWith("+1") && e164.length === 12) return "CA";
  return null;
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
  const country = countryFromE164(e164);
  if (country === "CA") return maskCanadaPhone(e164);
  if (country === "GA") return maskGabonPhone(e164);
  return e164;
}

export function isGabonE164(phone?: string | null): boolean {
  return Boolean(phone && normalizeGabonPhone(phone) === phone);
}

export function profileCountryName(code: PhoneAuthCountry): string {
  return code === "CA" ? "Canada" : "Gabon";
}
