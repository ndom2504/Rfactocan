/** Gabon E.164 helpers. National numbers are 8 digits, usually 0[2-9]xxxxxx. */

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

export function maskGabonPhone(e164: string): string {
  const national = e164.replace(/\D/g, "").replace(/^241/, "");
  if (national.length < 4) return e164;
  return `+241 ${national.slice(0, 2)} •• •• ${national.slice(-2)}`;
}

export function isGabonE164(phone?: string | null): boolean {
  return Boolean(phone && normalizeGabonPhone(phone) === phone);
}
