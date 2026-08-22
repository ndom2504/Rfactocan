import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveReferralFromRequest } from "@/lib/ambassador";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { currencyForCountry } from "@/lib/currency";
import {
  consumePhoneOtp,
  verifyPhoneOtpToken,
} from "@/lib/phone-otp";
import {
  countryFromE164,
  isPhonePlaceholderEmail,
  phonePlaceholderEmail,
  profileCountryName,
} from "@/lib/phone-auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  mfaToken: z.string().min(1),
  code: z.string().min(4).max(12),
  displayName: z.string().min(2).max(80).optional(),
  role: z.enum(["SENDER", "TRAVELER", "BOTH"]).optional(),
  ref: z.string().max(32).optional(),
});

const ERRORS: Record<string, string> = {
  INVALID_CODE: "Code incorrect.",
  CODE_EXPIRED: "Code expiré. Demandez un nouveau code.",
  TOO_MANY_ATTEMPTS: "Trop de tentatives. Demandez un nouveau code.",
  SMS_NOT_CONFIGURED:
    "L’envoi SMS n’est pas encore configuré (Twilio Verify). Réessayez plus tard.",
};

function publicUser(user: {
  id: string;
  email: string;
  displayName: string;
  role: string;
  preferredCurrency: string | null;
  phone: string | null;
  country: string | null;
}) {
  return {
    id: user.id,
    email: isPhonePlaceholderEmail(user.email) ? null : user.email,
    displayName: user.displayName,
    role: user.role,
    preferredCurrency: user.preferredCurrency || "CAD",
    phone: user.phone,
    country: user.country,
  };
}

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const phone = await verifyPhoneOtpToken(body.mfaToken);
    if (!phone) {
      return NextResponse.json(
        { error: "Session de vérification expirée. Renvoyez un code." },
        { status: 401 }
      );
    }

    let user = await prisma.user.findUnique({ where: { phone } });
    if (!user && (body.displayName?.trim().length ?? 0) < 2) {
      return NextResponse.json(
        {
          error: "Indiquez votre nom pour créer le compte.",
          needsProfile: true,
        },
        { status: 400 }
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

    if (!user) {
      const name = body.displayName!.trim();
      const referredById = await resolveReferralFromRequest(body.ref);
      const phoneCountry = countryFromE164(phone) ?? "GA";
      user = await prisma.user.create({
        data: {
          email: phonePlaceholderEmail(phone),
          displayName: name,
          phone,
          country: profileCountryName(phoneCountry),
          role: body.role ?? "BOTH",
          preferredCurrency: currencyForCountry(phoneCountry),
          verifiedAt: new Date(),
          ...(referredById ? { referredById } : {}),
        },
      });
    } else if (user.status === "SUSPENDED") {
      return NextResponse.json(
        { error: "Ce compte est suspendu." },
        { status: 403 }
      );
    } else if (!user.phone) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { phone },
      });
    }

    const token = await createSessionToken(user);
    await setSessionCookie(token);

    return NextResponse.json({
      token,
      user: publicUser(user),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Requête invalide" },
        { status: 400 }
      );
    }
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
