/** Public invite URL for the Rfacto WhatsApp community (set on Vercel). */
export function getWhatsAppCommunityUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    if (
      !host.endsWith("whatsapp.com") &&
      host !== "wa.me" &&
      host !== "api.whatsapp.com"
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}
