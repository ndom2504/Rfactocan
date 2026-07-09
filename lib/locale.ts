import { cookies } from "next/headers";
import { LOCALE_COOKIE, normalizeLocale, type Locale } from "@/lib/i18n";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getRequestLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  if (fromCookie === "en" || fromCookie === "fr") return fromCookie;

  const session = await getSessionUser();
  if (session) {
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { language: true },
    });
    return normalizeLocale(user?.language);
  }
  return "fr";
}
