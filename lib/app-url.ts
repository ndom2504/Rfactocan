/** Canonical public URL of the app (used for OAuth redirects). */
export function getAppUrl() {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

  return (fromEnv || "http://localhost:3000").replace(/\/$/, "");
}

export function getGoogleRedirectUri() {
  return `${getAppUrl()}/api/auth/google/callback`;
}
