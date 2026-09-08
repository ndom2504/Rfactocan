import { createRemoteJWKSet, jwtVerify } from "jose";

const APPLE_ISS = "https://appleid.apple.com";
const APPLE_JWKS = createRemoteJWKSet(
  new URL("https://appleid.apple.com/auth/keys")
);

export const APPLE_BUNDLE_ID = "com.rfacto.app";
export const APPLE_EMAIL_DOMAIN = "apple.rfacto.local";

export type AppleFullName = {
  givenName?: string | null;
  familyName?: string | null;
};

export type AppleProfile = {
  sub: string;
  email: string | null;
  emailVerified: boolean;
  isPrivateEmail: boolean;
};

export function appleAudiences(): string[] {
  const extra = process.env.APPLE_CLIENT_ID?.trim();
  if (extra && extra !== APPLE_BUNDLE_ID) {
    return [APPLE_BUNDLE_ID, extra];
  }
  return [APPLE_BUNDLE_ID];
}

export function applePlaceholderEmail(sub: string) {
  const local = sub.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 40) || "member";
  return `${local}@${APPLE_EMAIL_DOMAIN}`;
}

export function isApplePlaceholderEmail(email?: string | null) {
  return Boolean(email?.toLowerCase().endsWith(`@${APPLE_EMAIL_DOMAIN}`));
}

export function formatAppleDisplayName(
  name?: AppleFullName | null,
  email?: string | null
) {
  const parts = [name?.givenName?.trim(), name?.familyName?.trim()].filter(
    Boolean
  ) as string[];
  if (parts.length) return parts.join(" ").slice(0, 80);
  if (email && !isApplePlaceholderEmail(email)) {
    return email.split("@")[0].slice(0, 80);
  }
  return "Membre Rfacto";
}

export async function verifyAppleIdentityToken(
  identityToken: string,
  nonce?: string | null
): Promise<AppleProfile> {
  const { payload } = await jwtVerify(identityToken, APPLE_JWKS, {
    issuer: APPLE_ISS,
    audience: appleAudiences(),
  });
  if (!payload.sub) {
    throw new Error("Apple token missing sub");
  }
  if (nonce) {
    const claim = typeof payload.nonce === "string" ? payload.nonce : "";
    if (claim && claim !== nonce) {
      throw new Error("Apple nonce mismatch");
    }
  }
  const email =
    typeof payload.email === "string" && payload.email.includes("@")
      ? payload.email.toLowerCase()
      : null;
  return {
    sub: payload.sub,
    email,
    emailVerified:
      payload.email_verified === true || payload.email_verified === "true",
    isPrivateEmail:
      payload.is_private_email === true || payload.is_private_email === "true",
  };
}
