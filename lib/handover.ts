import { randomBytes } from "crypto";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateHandoverCode(length = 6) {
  const bytes = randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return code;
}

export function generateHandoverToken() {
  return randomBytes(24).toString("base64url");
}

export function handoverExpiry(hours = 48) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

export function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

export function handoverConfirmUrl(token: string) {
  return `${appBaseUrl()}/handover/${token}`;
}
