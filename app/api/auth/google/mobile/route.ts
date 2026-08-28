import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionToken, getSessionUserFromToken, setSessionCookie } from "@/lib/auth";
import { upsertUserFromGoogleProfile } from "@/lib/google-auth-user";
import {
  EXPO_GOOGLE_PROXY_REDIRECT,
  exchangeGoogleCode,
  fetchGoogleProfile,
  isAllowedGoogleMobileRedirect,
  isGoogleAuthConfigured,
  verifyGoogleIdToken,
  type GoogleProfile,
} from "@/lib/google-oauth";
import {
  googleMobileErrorMessage,
  readGoogleMobileTicket,
} from "@/lib/google-mobile-oauth";
import { startEmailOtpChallenge } from "@/lib/login-otp";

const schema = z
  .object({
    idToken: z.string().min(10).optional(),
    code: z.string().min(5).optional(),
    codeVerifier: z.string().min(10).optional(),
    redirectUri: z.string().min(8).optional(),
    ticket: z.string().min(20).optional(),
    ref: z.string().max(32).optional(),
  })
  .refine(
    (value) =>
      Boolean(value.ticket) ||
      Boolean(value.idToken) ||
      Boolean(value.code && value.codeVerifier && value.redirectUri),
    { message: "idToken, ticket ou code Google requis" }
  );

async function profileFromBody(body: z.infer<typeof schema>): Promise<GoogleProfile> {
  if (body.idToken) {
    return verifyGoogleIdToken(body.idToken);
  }

  if (!isGoogleAuthConfigured()) {
    throw new Error("Google OAuth is not configured");
  }
  if (
    !body.code ||
    !body.codeVerifier ||
    !body.redirectUri ||
    !isAllowedGoogleMobileRedirect(body.redirectUri)
  ) {
    throw new Error("redirect_uri_mismatch");
  }

  const tokens = await exchangeGoogleCode(body.code, {
    redirectUri: body.redirectUri,
    codeVerifier: body.codeVerifier,
  });
  if (tokens.id_token) {
    return verifyGoogleIdToken(tokens.id_token);
  }
  if (tokens.access_token) {
    return fetchGoogleProfile(tokens.access_token);
  }
  throw new Error("Google n'a pas renvoyé de jeton.");
}

function googleAuthErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : "";
  if (raw.includes("audience")) {
    return "Client Google non autorisé (vérifiez GOOGLE_CLIENT_ID / Android / iOS).";
  }
  if (raw.includes("redirect_uri_mismatch")) {
    return `URI de redirection Google non autorisée. Ajoutez ${EXPO_GOOGLE_PROXY_REDIRECT} aux URI du client Web (Google Cloud → Identifiants).`;
  }
  if (raw.includes("invalid_grant")) {
    return "Code Google expiré. Réessayez.";
  }
  if (raw.includes("not configured")) {
    return "Google Auth n'est pas configuré sur le serveur (GOOGLE_CLIENT_ID / SECRET).";
  }
  return "Échec de la connexion Google.";
}

async function jsonFromGoogleTicket(ticket: string) {
  const payload = await readGoogleMobileTicket(ticket);
  if (payload.error) {
    return NextResponse.json(
      { error: googleMobileErrorMessage(payload.error) },
      { status: 401 }
    );
  }
  if (payload.mfaToken) {
    return NextResponse.json({
      mfaRequired: true,
      mfaToken: payload.mfaToken,
      emailHint: payload.emailHint || "",
    });
  }
  if (!payload.token) {
    return NextResponse.json(
      { error: "Connexion Google impossible." },
      { status: 401 }
    );
  }
  const user = await getSessionUserFromToken(payload.token);
  if (!user) {
    return NextResponse.json(
      { error: "Session Google expirée. Réessayez." },
      { status: 401 }
    );
  }
  return NextResponse.json({
    token: payload.token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      preferredCurrency: user.preferredCurrency || "CAD",
      avatarUrl: user.avatarUrl,
    },
  });
}

/**
 * Mobile Google Sign-In: verify ID token or exchange an auth code, upsert user,
 * return Bearer session token or MFA challenge when Resend is configured.
 * POST { idToken } | { code, codeVerifier, redirectUri }
 *   → { token, user } | { mfaRequired, mfaToken, emailHint }
 */
export async function POST(request: Request) {
  if (
    !process.env.GOOGLE_CLIENT_ID &&
    !process.env.GOOGLE_ANDROID_CLIENT_ID &&
    !process.env.GOOGLE_IOS_CLIENT_ID
  ) {
    return NextResponse.json(
      { error: "Google Auth n'est pas configuré." },
      { status: 503 }
    );
  }

  try {
    const body = schema.parse(await request.json());
    if (body.ticket) {
      return jsonFromGoogleTicket(body.ticket);
    }
    const profile = await profileFromBody(body);
    const result = await upsertUserFromGoogleProfile(profile, {
      ref: body.ref,
    });

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
        { error: error.issues[0]?.message ?? "idToken ou code Google requis" },
        { status: 400 }
      );
    }
    console.error("Google mobile auth error:", error);
    return NextResponse.json(
      { error: googleAuthErrorMessage(error) },
      { status: 401 }
    );
  }
}
