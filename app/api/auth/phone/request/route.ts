import { NextResponse } from "next/server";
import { z } from "zod";
import { issuePhoneOtp } from "@/lib/phone-otp";
import {
  normalizeAuthPhone,
  type PhoneAuthCountry,
} from "@/lib/phone-auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  phone: z.string().min(7).max(24),
  country: z.enum(["GA", "CA"]).optional(),
});

const ERRORS: Record<string, string> = {
  INVALID_PHONE:
    "Numéro invalide. Gabon : 07 00 00 00. Canada : 514 555 0123.",
  RATE_LIMITED:
    "Trop de codes envoyés. Réessayez dans une heure.",
  TOO_SOON: "Patientez une minute avant de renvoyer un code.",
  SMS_NOT_CONFIGURED:
    "L’envoi SMS n’est pas encore configuré (Twilio). Réessayez plus tard.",
  SMS_SEND_FAILED: "Impossible d’envoyer le SMS. Réessayez dans un instant.",
};

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const hint = body.country as PhoneAuthCountry | undefined;
    const phone = normalizeAuthPhone(body.phone, hint);
    if (!phone) {
      return NextResponse.json(
        { error: ERRORS.INVALID_PHONE },
        { status: 400 }
      );
    }

    const issued = await issuePhoneOtp(phone);
    if (!issued.ok) {
      const status =
        issued.error === "TOO_SOON"
          ? 429
          : issued.error === "RATE_LIMITED"
            ? 429
            : issued.error === "SMS_NOT_CONFIGURED"
              ? 503
              : 502;
      return NextResponse.json(
        {
          error: ERRORS[issued.error] || ERRORS.SMS_SEND_FAILED,
          retryAfterSec: issued.retryAfterSec,
        },
        { status }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { phone },
      select: { id: true },
    });

    return NextResponse.json({
      mfaRequired: true,
      mfaToken: issued.mfaToken,
      phoneHint: issued.phoneHint,
      isNew: !existing,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: ERRORS.INVALID_PHONE },
        { status: 400 }
      );
    }
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
