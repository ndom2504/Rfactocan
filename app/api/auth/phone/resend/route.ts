import { NextResponse } from "next/server";
import { z } from "zod";
import { issuePhoneOtp, verifyPhoneOtpToken } from "@/lib/phone-otp";

const schema = z.object({
  mfaToken: z.string().min(1),
});

const ERRORS: Record<string, string> = {
  RATE_LIMITED: "Trop de codes envoyés. Réessayez dans une heure.",
  TOO_SOON: "Patientez une minute avant de renvoyer un code.",
  SMS_NOT_CONFIGURED:
    "L’envoi SMS n’est pas encore configuré (Twilio). Réessayez plus tard.",
  SMS_TRIAL_UNVERIFIED:
    "Compte Twilio d’essai : ce numéro doit d’abord être vérifié dans Twilio (Verified Caller IDs), ou passez le compte en production.",
  SMS_GEO_BLOCKED:
    "Twilio bloque encore le Gabon / ce pays. Dans Twilio : Verify → Settings → Geo permissions, autorisez le SMS vers ce pays.",
  SMS_FRAUD_BLOCKED:
    "Twilio Fraud Guard a bloqué ce préfixe pour 12 h. Réessayez plus tard, ou ajoutez le numéro à la Safe List Verify.",
  INVALID_PHONE:
    "Numéro invalide. Indiquez le pays et un mobile local, ou un numéro au format +indicatif.",
  SMS_SEND_FAILED: "Impossible d’envoyer le SMS. Réessayez dans un instant.",
};

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const phone = await verifyPhoneOtpToken(body.mfaToken);
    if (!phone) {
      return NextResponse.json(
        { error: "Session expirée. Renvoyez un code." },
        { status: 401 }
      );
    }

    const issued = await issuePhoneOtp(phone);
    if (!issued.ok) {
      const status =
        issued.error === "TOO_SOON" || issued.error === "RATE_LIMITED"
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

    return NextResponse.json({
      mfaToken: issued.mfaToken,
      phoneHint: issued.phoneHint,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
