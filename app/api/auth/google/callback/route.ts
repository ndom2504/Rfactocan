import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAppUrl } from "@/lib/app-url";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { upsertUserFromGoogleProfile } from "@/lib/google-auth-user";
import {
  exchangeGoogleCode,
  fetchGoogleProfile,
} from "@/lib/google-oauth";
import { startEmailOtpChallenge } from "@/lib/login-otp";

const STATE_COOKIE = "rfacto_oauth_state";

export async function GET(request: Request) {
  const appUrl = getAppUrl();
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(oauthError)}`, appUrl)
    );
  }

  const cookieStore = await cookies();
  const raw = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  let saved: { state: string; next: string } | null = null;
  try {
    saved = raw ? (JSON.parse(raw) as { state: string; next: string }) : null;
  } catch {
    saved = null;
  }

  if (!code || !state || !saved || saved.state !== state) {
    return NextResponse.redirect(
      new URL("/login?error=invalid_oauth_state", appUrl)
    );
  }

  try {
    const tokens = await exchangeGoogleCode(code);
    const profile = await fetchGoogleProfile(tokens.access_token);
    const result = await upsertUserFromGoogleProfile(profile);

    if (!result.ok) {
      const map = {
        email_required: "google_email_required",
        email_unverified: "google_email_unverified",
        suspended: "account_suspended",
        failed: "google_auth_failed",
      } as const;
      return NextResponse.redirect(
        new URL(`/login?error=${map[result.error]}`, appUrl)
      );
    }

    const next =
      saved.next.startsWith("/") && !saved.next.startsWith("//")
        ? saved.next
        : "/dashboard";

    const challenge = await startEmailOtpChallenge({
      id: result.user.id,
      email: result.user.email,
      displayName: result.user.displayName,
    });

    if (challenge.ok) {
      const loginUrl = new URL("/login", appUrl);
      loginUrl.searchParams.set("mfa", "1");
      loginUrl.searchParams.set("mfaToken", challenge.mfaToken);
      loginUrl.searchParams.set("emailHint", challenge.emailHint);
      loginUrl.searchParams.set("next", next);
      return NextResponse.redirect(loginUrl);
    }

    if (!challenge.skipped) {
      return NextResponse.redirect(
        new URL(
          `/login?error=${
            challenge.error === "DOMAIN_NOT_VERIFIED"
              ? "otp_domain_not_verified"
              : "otp_send_failed"
          }`,
          appUrl
        )
      );
    }

    console.warn(
      "[google] RESEND_API_KEY missing — OTP skipped, session issued directly"
    );

    const token = await createSessionToken({
      id: result.user.id,
      email: result.user.email,
      role: result.user.role,
    });
    await setSessionCookie(token);

    return NextResponse.redirect(new URL(next, appUrl));
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/login?error=google_auth_failed", appUrl)
    );
  }
}
