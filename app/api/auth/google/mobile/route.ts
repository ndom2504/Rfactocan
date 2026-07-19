import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { upsertUserFromGoogleProfile } from "@/lib/google-auth-user";
import { verifyGoogleIdToken } from "@/lib/google-oauth";
import { startEmailOtpChallenge } from "@/lib/login-otp";

const schema = z.object({
  idToken: z.string().min(10),
});

/**
 * Mobile Google Sign-In: verify ID token, upsert user, return Bearer session token
 * or MFA challenge when Resend is configured.
 * POST { idToken: string } → { token, user } | { mfaRequired, mfaToken, emailHint }
 */
export async function POST(request: Request) {
  if (!process.env.GOOGLE_CLIENT_ID && !process.env.GOOGLE_ANDROID_CLIENT_ID) {
    return NextResponse.json(
      { error: "Google Auth n'est pas configuré." },
      { status: 503 }
    );
  }

  try {
    const body = schema.parse(await request.json());
    const profile = await verifyGoogleIdToken(body.idToken);
    const result = await upsertUserFromGoogleProfile(profile);

    if (!result.ok) {
      if (result.error === "email_required") {
        return NextResponse.json(
          { error: "Google n'a pas fourni d'email." },
          { status: 400 }
        );
      }
      if (result.error === "email_unverified") {
        return NextResponse.json(
          { error: "Votre email Google n'est pas vérifié." },
          { status: 400 }
        );
      }
      if (result.error === "suspended") {
        return NextResponse.json(
          { error: "Ce compte est suspendu." },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: "Échec de la connexion Google." },
        { status: 500 }
      );
    }

    const { user } = result;

    const challenge = await startEmailOtpChallenge({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    });

    if (challenge.ok) {
      return NextResponse.json({
        mfaRequired: true,
        mfaToken: challenge.mfaToken,
        emailHint: challenge.emailHint,
      });
    }

    if (!challenge.skipped) {
      const message =
        challenge.error === "DOMAIN_NOT_VERIFIED"
          ? challenge.detail ||
            "Vérification indisponible : EMAIL_FROM doit utiliser votre domaine Resend vérifié."
          : challenge.detail
            ? `Impossible d'envoyer le code (${challenge.from || "from?"}): ${challenge.detail}`
            : "Impossible d'envoyer le code de vérification. Réessayez dans un instant.";
      return NextResponse.json(
        {
          error: message,
          from: challenge.from,
          detail: challenge.detail,
        },
        { status: 502 }
      );
    }

    console.warn(
      "[google/mobile] RESEND_API_KEY missing — OTP skipped, session issued directly"
    );

    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    await setSessionCookie(token);

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        preferredCurrency: user.preferredCurrency || "CAD",
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "idToken requis" },
        { status: 400 }
      );
    }
    console.error("Google mobile auth error:", error);
    const message =
      error instanceof Error && error.message.includes("audience")
        ? "Client Google non autorisé (vérifiez GOOGLE_CLIENT_ID / Android / iOS)."
        : "Échec de la connexion Google.";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
