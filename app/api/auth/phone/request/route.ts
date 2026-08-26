import { NextResponse } from "next/server";
import { z } from "zod";
import { issuePhoneOtp } from "@/lib/phone-otp";
import { normalizeAuthPhone, phoneLookupValues } from "@/lib/phone-auth";
import { resolvePhoneCountry } from "@/lib/phone-countries";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  phone: z.string().min(7).max(40),
  country: z.string().min(1).max(80).optional(),
});

const ERRORS: Record<string, string> = {
  INVALID_PHONE:
    "Numéro invalide. Indiquez le pays et un mobile local, ou un numéro au format +indicatif.",
  RATE_LIMITED:
    "Trop de codes envoyés. Réessayez dans une heure.",
  TOO_SOON: "Patientez une minute avant de renvoyer un code.",
  SMS_NOT_CONFIGURED:
    "L’envoi SMS n’est pas encore configuré (Twilio). Réessayez plus tard.",
  SMS_TRIAL_UNVERIFIED:
    "Compte Twilio d’essai : ce numéro doit d’abord être vérifié dans Twilio (Verified Caller IDs), ou passez le compte en production.",
  SMS_GEO_BLOCKED:
    "Twilio bloque encore le Gabon / ce pays. Dans Twilio : Verify → Settings → Geo permissions, autorisez le SMS vers ce pays.",
  SMS_FRAUD_BLOCKED:
    "Twilio Fraud Guard a bloqué ce préfixe pour 12 h. Réessayez plus tard, ou ajoutez le numéro à la Safe List Verify.",
  SMS_SEND_FAILED: "Impossible d’envoyer le SMS. Réessayez dans un instant.",
};

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const hint = resolvePhoneCountry(body.country);
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
            : issued.error === "SMS_NOT_CONFIGURED" ||
                issued.error === "SMS_TRIAL_UNVERIFIED" ||
                issued.error === "SMS_GEO_BLOCKED" ||
                issued.error === "SMS_FRAUD_BLOCKED"
              ? 503
              : issued.error === "INVALID_PHONE"
                ? 400
              : 502;
      return NextResponse.json(
        {
          error: ERRORS[issued.error] || ERRORS.SMS_SEND_FAILED,
          retryAfterSec: issued.retryAfterSec,
        },
        { status }
      );
    }

    const existing = await prisma.user.findFirst({
      where: { phone: { in: phoneLookupValues(phone) } },
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
