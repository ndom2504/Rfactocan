import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAppUrl } from "@/lib/app-url";
import { getGoogleAuthUrl, isGoogleAuthConfigured } from "@/lib/google-oauth";

const STATE_COOKIE = "rfacto_oauth_state";

export async function GET(request: Request) {
  if (!isGoogleAuthConfigured()) {
    return NextResponse.redirect(
      new URL("/login?error=google_not_configured", getAppUrl())
    );
  }

  const { searchParams } = new URL(request.url);
  const next = searchParams.get("next") || "/dashboard";
  const state = crypto.randomUUID();

  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, JSON.stringify({ state, next }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return NextResponse.redirect(getGoogleAuthUrl(state));
}
