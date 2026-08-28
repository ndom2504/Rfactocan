import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAppUrl } from "@/lib/app-url";
import {
  isAllowedDoneOrigin,
  signGoogleMobileState,
} from "@/lib/google-mobile-oauth";
import { getGoogleAuthUrl, isGoogleAuthConfigured } from "@/lib/google-oauth";

const STATE_COOKIE = "rfacto_oauth_state";

export async function GET(request: Request) {
  if (!isGoogleAuthConfigured()) {
    return NextResponse.redirect(
      new URL("/login?error=google_not_configured", getAppUrl())
    );
  }

  const { searchParams } = new URL(request.url);
  if (searchParams.get("expo") === "1") {
    const doneOrigin = new URL(request.url).origin;
    if (!isAllowedDoneOrigin(doneOrigin)) {
      return NextResponse.json(
        { error: "Origine mobile Google non autorisée." },
        { status: 400 }
      );
    }
    const state = await signGoogleMobileState(doneOrigin);
    return NextResponse.redirect(getGoogleAuthUrl(state));
  }

  const next = searchParams.get("next") || "/dashboard";
  const countryRaw = searchParams.get("country")?.trim().toUpperCase() || "";
  const country = /^[A-Z]{2}$/.test(countryRaw) ? countryRaw : null;
  const state = crypto.randomUUID();

  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, JSON.stringify({ state, next, country }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return NextResponse.redirect(getGoogleAuthUrl(state));
}
