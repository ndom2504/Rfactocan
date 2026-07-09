import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { LOCALE_COOKIE, normalizeLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  locale: z.enum(["fr", "en"]),
});

export async function POST(request: Request) {
  const body = schema.parse(await request.json());
  const locale = normalizeLocale(body.locale);

  const res = NextResponse.json({ locale });
  res.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  const session = await getSessionUser();
  if (session) {
    await prisma.user.update({
      where: { id: session.id },
      data: { language: locale },
    });
  }

  return res;
}
