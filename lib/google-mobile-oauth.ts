import { SignJWT, jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/app-url";

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export function looksLikeJwt(value: string) {
  const parts = value.split(".");
  return parts.length === 3 && parts.every((part) => part.length > 4);
}

/** Hosts allowed as Expo AuthSession return (never an arbitrary website). */
export function isAllowedDoneOrigin(origin: string) {
  const value = origin.trim().replace(/\/$/, "").toLowerCase();
  const allowed = new Set([
    getAppUrl().replace(/\/$/, "").toLowerCase(),
    "https://rfacto.com",
    "https://www.rfacto.com",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]);
  return allowed.has(value);
}

/** Deep links back into Expo Go / the native app — never https. */
export function isAllowedAppReturnUrl(uri: string) {
  const value = uri.trim();
  if (!value || value.length > 1500) return false;
  try {
    const url = new URL(value);
    const protocol = url.protocol.replace(":", "").toLowerCase();
    if (protocol === "rfacto") return true;
    if (protocol === "exp" || protocol === "exps") return true;
    if (protocol.startsWith("exp+")) return true;
    return false;
  } catch {
    return false;
  }
}

export async function signGoogleMobileState(
  doneOrigin: string,
  appReturnUrl?: string
) {
  if (!isAllowedDoneOrigin(doneOrigin)) {
    throw new Error("doneOrigin invalide");
  }
  if (appReturnUrl && !isAllowedAppReturnUrl(appReturnUrl)) {
    throw new Error("returnUrl invalide");
  }
  return new SignJWT({
    mobile: true,
    doneOrigin,
    ...(appReturnUrl ? { appReturnUrl } : {}),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(getSecret());
}

export async function readGoogleMobileState(state: string | null) {
  if (!state) return null;
  try {
    const { payload } = await jwtVerify(state, getSecret());
    if (payload.mobile !== true || typeof payload.doneOrigin !== "string") {
      return null;
    }
    if (!isAllowedDoneOrigin(payload.doneOrigin)) return null;
    const appReturnUrl =
      typeof payload.appReturnUrl === "string" &&
      isAllowedAppReturnUrl(payload.appReturnUrl)
        ? payload.appReturnUrl
        : undefined;
    return {
      doneOrigin: payload.doneOrigin.replace(/\/$/, ""),
      appReturnUrl,
    };
  } catch {
    return null;
  }
}

export type GoogleMobileTicket = {
  token?: string;
  mfaToken?: string;
  emailHint?: string;
  error?: string;
};

export async function signGoogleMobileTicket(ticket: GoogleMobileTicket) {
  return new SignJWT({ ...ticket, typ: "google_mobile" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(getSecret());
}

export async function readGoogleMobileTicket(ticket: string) {
  const { payload } = await jwtVerify(ticket, getSecret());
  if (payload.typ !== "google_mobile") {
    throw new Error("Ticket Google invalide");
  }
  return {
    token: typeof payload.token === "string" ? payload.token : undefined,
    mfaToken: typeof payload.mfaToken === "string" ? payload.mfaToken : undefined,
    emailHint: typeof payload.emailHint === "string" ? payload.emailHint : undefined,
    error: typeof payload.error === "string" ? payload.error : undefined,
  } satisfies GoogleMobileTicket;
}

export function googleMobileErrorMessage(code: string) {
  const map: Record<string, string> = {
    access_denied: "Connexion Google annulée.",
    google_email_required: "Google n'a pas fourni d'email.",
    google_email_unverified: "Votre email Google n'est pas vérifié.",
    account_suspended: "Ce compte est suspendu.",
    google_auth_failed: "Échec de la connexion Google.",
    otp_send_failed: "Impossible d'envoyer le code de vérification.",
    otp_domain_not_verified: "Vérification email indisponible (domaine Resend).",
    invalid_oauth_state: "Session Google expirée. Réessayez.",
  };
  return map[code] || "Échec de la connexion Google.";
}

export const GOOGLE_MOBILE_DONE_PATH = "/google-app-return";

export function mobileDoneUrl(
  doneOrigin: string,
  params: Record<string, string | undefined>
) {
  const url = new URL(GOOGLE_MOBILE_DONE_PATH, doneOrigin);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  return url;
}

export function redirectToMobileDone(
  doneOrigin: string,
  params: Record<string, string | undefined>
) {
  return NextResponse.redirect(mobileDoneUrl(doneOrigin, params));
}

export async function redirectToMobileTicket(
  doneOrigin: string,
  ticket: GoogleMobileTicket,
  appReturnUrl?: string
) {
  if (ticket.error) {
    return redirectToMobileDone(doneOrigin, {
      error: ticket.error,
      app: appReturnUrl,
    });
  }
  const signed = await signGoogleMobileTicket(ticket);
  return redirectToMobileDone(doneOrigin, {
    ticket: signed,
    app: appReturnUrl,
    mfa: ticket.mfaToken ? "1" : undefined,
  });
}

export function mobileDonePageHtml(message: string) {
  const text = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>Rfacto</title>
  </head>
  <body style="font-family:system-ui,sans-serif;padding:32px;text-align:center;background:#0f6b4c;color:#fff">
    <p>${text}</p>
    <p>Vous pouvez fermer cette fenêtre.</p>
  </body>
</html>`;
}
