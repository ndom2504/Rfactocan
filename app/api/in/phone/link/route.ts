import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { consumePhoneOtp, verifyPhoneOtpToken } from "@/lib/phone-otp";
import {
  countryFromE164,
  maskAuthPhone,
  phoneLookupValues,
  profileCountryName,
} from "@/lib/phone-auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  mfaToken: z.string().min(1),
  code: z.string().min(4).max(12),
});

const ERRORS: Record<string, string> = {
  INVALID_CODE: "Code incorrect.",
  CODE_EXPIRED: "Code expiré. Demandez un nouveau code.",
  TOO_MANY_ATTEMPTS: "Trop de tentatives. Demandez un nouveau code.",
  SMS_NOT_CONFIGURED:
    "L’envoi SMS n’est pas encore configuré (Twilio Verify). Réessayez plus tard.",
};

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = schema.parse(await request.json());
    const phone = await verifyPhoneOtpToken(body.mfaToken);
    if (!phone) {
      return NextResponse.json(
        { error: "Session de vérification expirée. Renvoyez un code." },
        { status: 401 }
      );
    }

    const result = await consumePhoneOtp(phone, body.code);
    if (!result.ok) {
      const status = result.error === "SMS_NOT_CONFIGURED" ? 503 : 401;
      return NextResponse.json(
        { error: ERRORS[result.error] || "Code incorrect." },
        { status }
      );
    }

    const existing = await prisma.user.findFirst({
      where: { phone: { in: phoneLookupValues(phone) } },
      select: { id: true, status: true },
    });
    if (existing && existing.id !== session.id) {
      return NextResponse.json(
        { error: "Ce numéro est déjà lié à un autre compte Rfacto." },
        { status: 409 }
      );
    }

    const phoneCountry = countryFromE164(phone);
    const user = await prisma.user.update({
      where: { id: session.id },
      data: {
        phone,
        verifiedAt: new Date(),
        ...(phoneCountry ? { country: profileCountryName(phoneCountry) } : {}),
      },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        phone: true,
      },
    });

    return NextResponse.json({
      ok: true,
      user: {
        ...user,
        phoneMasked: user.phone ? maskAuthPhone(user.phone) : null,
        ready: true,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
    }
    console.error("[in/phone/link]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
