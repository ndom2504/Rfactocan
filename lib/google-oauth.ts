import { getGoogleRedirectUri } from "@/lib/app-url";

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO = "https://www.googleapis.com/oauth2/v3/userinfo";

export function isGoogleAuthConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );
}

export function getGoogleAuthUrl(state: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is not set");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getGoogleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state,
  });

  return `${GOOGLE_AUTH}?${params.toString()}`;
}

/** Expo Go / EAS without a native iOS client use the AuthSession proxy. */
export const EXPO_GOOGLE_PROXY_REDIRECT =
  "https://auth.expo.io/@ndom2504/rfacto";

function normalizeRedirect(uri: string) {
  return uri.trim().replace(/\/$/, "");
}

/** Blocks open redirects on the mobile code-exchange path. */
export function isAllowedGoogleMobileRedirect(uri: string) {
  const value = normalizeRedirect(uri);
  const allowed = new Set([
    normalizeRedirect(getGoogleRedirectUri()),
    EXPO_GOOGLE_PROXY_REDIRECT,
    "https://auth.expo.io/ndom2504/rfacto",
    "rfacto://oauthredirect",
  ]);
  return allowed.has(value);
}

export async function exchangeGoogleCode(
  code: string,
  options?: { redirectUri?: string; codeVerifier?: string }
) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth is not configured");
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: options?.redirectUri || getGoogleRedirectUri(),
    grant_type: "authorization_code",
  });
  if (options?.codeVerifier) {
    body.set("code_verifier", options.codeVerifier);
  }

  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token exchange failed: ${text}`);
  }

  return res.json() as Promise<{ access_token: string; id_token?: string }>;
}

export type GoogleProfile = {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

export async function fetchGoogleProfile(accessToken: string) {
  const res = await fetch(GOOGLE_USERINFO, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error("Failed to fetch Google profile");
  }
  return res.json() as Promise<GoogleProfile>;
}

/** Allowed OAuth client IDs for ID token `aud` (web + mobile). */
export function getGoogleAllowedAudiences() {
  return [
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
    process.env.GOOGLE_IOS_CLIENT_ID,
  ].filter((v): v is string => Boolean(v?.trim()));
}

/**
 * Verify a Google ID token from mobile (or other native clients).
 * Uses tokeninfo; audience must match a configured client ID when any are set.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
  );
  if (!res.ok) {
    throw new Error("Invalid Google ID token");
  }

  const data = (await res.json()) as GoogleProfile & {
    aud?: string;
    error?: string;
    error_description?: string;
  };

  if (data.error || !data.sub) {
    throw new Error(data.error_description || data.error || "Invalid Google ID token");
  }

  const allowed = getGoogleAllowedAudiences();
  if (allowed.length > 0 && data.aud && !allowed.includes(data.aud)) {
    throw new Error("Google token audience mismatch");
  }

  return {
    sub: data.sub,
    email: data.email,
    email_verified:
      typeof data.email_verified === "boolean"
        ? data.email_verified
        : String(data.email_verified) === "true",
    name: data.name,
    picture: data.picture,
  };
}
