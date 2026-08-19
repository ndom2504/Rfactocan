/** Canonical public URL of the app (used for OAuth redirects). */
export function getAppUrl() {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

  return (fromEnv || "http://localhost:3000").replace(/\/$/, "");
}

/** Internal path only (blocks open redirects). */
export function safeNextPath(value: string | null | undefined, fallback = "/dashboard") {
  const next = (value || "").trim();
  if (next.startsWith("/") && !next.startsWith("//")) return next;
  return fallback;
}

export function getGoogleRedirectUri() {
  return `${getAppUrl()}/api/auth/google/callback`;
}
