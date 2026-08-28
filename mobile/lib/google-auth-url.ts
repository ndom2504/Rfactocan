import { getApiUrl } from "@/lib/api";

/** Same host as Google OAuth callback (apex), so AuthSession can close the browser. */
export function getOAuthOrigin() {
  try {
    const url = new URL(getApiUrl());
    if (url.hostname === "www.rfacto.com" || url.hostname === "rfacto.com") {
      return "https://rfacto.com";
    }
    return url.origin;
  } catch {
    return "https://rfacto.com";
  }
}

export function googleAuthSessionUrls() {
  const origin = getOAuthOrigin();
  return {
    start: `${origin}/api/auth/google?expo=1`,
    done: `${origin}/google-app-return`,
    poll: `${origin}/api/auth/google/mobile/poll`,
  };
}

export function isGoogleReturnUrl(url: string) {
  return (
    url.includes("/google-app-return") ||
    url.includes("/api/auth/google/mobile/done") ||
    url.includes("google-auth") ||
    url.includes("oauth/google")
  );
}

export function ticketFromUrl(url: string) {
  try {
    return new URL(url).searchParams.get("ticket") || "";
  } catch {
    const match = /[?&]ticket=([^&]+)/.exec(url);
    return match ? decodeURIComponent(match[1]) : "";
  }
}

export function errorFromUrl(url: string) {
  try {
    return new URL(url).searchParams.get("error") || "";
  } catch {
    const match = /[?&]error=([^&]+)/.exec(url);
    return match ? decodeURIComponent(match[1]) : "";
  }
}
