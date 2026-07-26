/** Normalize optional service website URL (adds https:// when missing). */
export function normalizeWebsiteUrl(raw?: string | null): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  if (s.length > 300) return null;
  const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withProto);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function displayWebsiteHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return url;
  }
}
