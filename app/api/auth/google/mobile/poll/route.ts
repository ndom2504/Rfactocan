import { NextResponse } from "next/server";
import { googleMobileErrorMessage } from "@/lib/google-mobile-oauth";
import { readExpoGoogleLogin } from "@/lib/expo-google-login";

export async function GET(request: Request) {
  const sid = new URL(request.url).searchParams.get("sid") || "";
  const result = await readExpoGoogleLogin(sid);
  const headers = { "Cache-Control": "no-store" };

  if ("pending" in result && result.pending) {
    return NextResponse.json({ pending: true }, { headers });
  }

  if ("error" in result) {
    return NextResponse.json(
      {
        pending: false,
        error: googleMobileErrorMessage(result.error),
      },
      { headers }
    );
  }

  return NextResponse.json({ pending: false, ...result }, { headers });
}
