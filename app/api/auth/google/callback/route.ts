import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { REF_COOKIE } from "@/lib/ambassador";
import { getAppUrl } from "@/lib/app-url";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { upsertUserFromGoogleProfile } from "@/lib/google-auth-user";
import {
  looksLikeJwt,
  readGoogleMobileState,
  redirectToMobileDone,
  redirectToMobileTicket,
} from "@/lib/google-mobile-oauth";
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
  const mobile = await readGoogleMobileState(state);
  const mobileOrigin = mobile?.doneOrigin || (looksLikeJwt(state || "") ? appUrl : null);
  const appReturn = mobile?.appReturnUrl;

  if (oauthError) {
    if (mobileOrigin) {
      return redirectToMobileDone(mobileOrigin, {
        error: oauthError,
        app: appReturn,
      });
    }
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(oauthError)}`, appUrl)
    );
  }

  if (mobileOrigin) {
    if (!code) {
      return redirectToMobileDone(mobileOrigin, {
        error: "google_auth_failed",
        app: appReturn,
      });
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
        return redirectToMobileDone(mobileOrigin, {
          error: map[result.error],
          app: appReturn,
        });
      }

      const challenge = await startEmailOtpChallenge({
        id: result.user.id,
        email: result.user.email,
        displayName: result.user.displayName,
      });

      if (challenge.ok) {
        return redirectToMobileTicket(
          mobileOrigin,
          {
            mfaToken: challenge.mfaToken,
            emailHint: challenge.emailHint,
          },
          appReturn
        );
      }

      if (!challenge.skipped) {
        return redirectToMobileDone(mobileOrigin, {
          error:
            challenge.error === "DOMAIN_NOT_VERIFIED"
              ? "otp_domain_not_verified"
              : "otp_send_failed",
          app: appReturn,
        });
      }

      const token = await createSessionToken({
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
      });
      return redirectToMobileTicket(mobileOrigin, { token }, appReturn);
    } catch (error) {
      console.error("Google OAuth mobile callback error:", error);
      return redirectToMobileDone(mobileOrigin, {
        error: "google_auth_failed",
        app: appReturn,
      });
    }
  }

  const cookieStore = await cookies();
  const raw = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);
  const refFromCookie = cookieStore.get(REF_COOKIE)?.value ?? null;

  let saved: { state: string; next: string; country?: string | null } | null =
    null;
  try {
    saved = raw
      ? (JSON.parse(raw) as {
          state: string;
          next: string;
          country?: string | null;
        })
      : null;
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
    const result = await upsertUserFromGoogleProfile(profile, {
      ref: refFromCookie,
      country: saved.country,
    });

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
      loginUrl.searchParams.set("next", next === "/dashboard" ? "/dashboard?tour=1" : next);
      return NextResponse.redirect(loginUrl);
    }

    if (!challenge.skipped) {
      const loginUrl = new URL("/login", appUrl);
      loginUrl.searchParams.set(
        "error",
        challenge.error === "DOMAIN_NOT_VERIFIED"
          ? "otp_domain_not_verified"
          : "otp_send_failed"
      );
      if (challenge.from) {
        loginUrl.searchParams.set("from", challenge.from);
      }
      if (challenge.detail) {
        loginUrl.searchParams.set(
          "detail",
          challenge.detail.slice(0, 180)
        );
      }
      return NextResponse.redirect(loginUrl);
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

    const dest =
      next === "/dashboard" || next.startsWith("/dashboard?")
        ? "/dashboard?tour=1"
        : next;
    return NextResponse.redirect(new URL(dest, appUrl));
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/login?error=google_auth_failed", appUrl)
    );
  }
}
