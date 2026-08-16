import { prisma } from "@/lib/prisma";

export const WHATSAPP_COMMUNITY_SETTING_KEY = "whatsapp_community_url";

export function parseWhatsAppCommunityUrl(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
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

function envFallback(): string | null {
  return parseWhatsAppCommunityUrl(
    process.env.NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL
  );
}

/** Live invite URL: admin setting first, then env (Vercel). */
export async function getWhatsAppCommunityUrl(): Promise<string | null> {
  try {
    const row = await prisma.appSetting.findUnique({
      where: { key: WHATSAPP_COMMUNITY_SETTING_KEY },
      select: { value: true },
    });
    if (row) {
      return parseWhatsAppCommunityUrl(row.value) ?? envFallback();
    }
  } catch (error) {
    console.error("[whatsapp-community] AppSetting read failed", error);
  }
  return envFallback();
}

export async function setWhatsAppCommunityUrl(raw: string): Promise<string | null> {
  const parsed = parseWhatsAppCommunityUrl(raw);
  if (raw.trim() && !parsed) {
    throw new Error("INVALID_URL");
  }
  if (!parsed) {
    await prisma.appSetting.deleteMany({
      where: { key: WHATSAPP_COMMUNITY_SETTING_KEY },
    });
    return envFallback();
  }
  await prisma.appSetting.upsert({
    where: { key: WHATSAPP_COMMUNITY_SETTING_KEY },
    create: { key: WHATSAPP_COMMUNITY_SETTING_KEY, value: parsed },
    update: { value: parsed },
  });
  return parsed;
}
