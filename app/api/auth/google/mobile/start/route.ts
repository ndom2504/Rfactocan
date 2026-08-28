import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/app-url";
import { isGoogleAuthConfigured } from "@/lib/google-oauth";

/** Alias — Expo should call GET /api/auth/google?expo=1 */
export async function GET() {
  if (!isGoogleAuthConfigured()) {
    return NextResponse.redirect(
      new URL("/login?error=google_not_configured", getAppUrl())
    );
  }
  return NextResponse.redirect(new URL("/api/auth/google?expo=1", getAppUrl()));
}
