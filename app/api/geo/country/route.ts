import { NextResponse } from "next/server";
import { getCountryName } from "@/lib/corridors";

export const runtime = "nodejs";

type GeoBody = {
  country_code?: string;
  country?: string;
  error?: boolean;
};

function normalizeCode(raw?: string | null): string | null {
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  if (code.length !== 2 || code === "XX" || code === "T1") return null;
  return code;
}

/**
 * Suggest country from IP headers (Vercel / Cloudflare) or ipapi.co fallback.
 * Always a suggestion — the client must let the user confirm or change.
 */
export async function GET(request: Request) {
  const headers = request.headers;
  const fromHeader = normalizeCode(
    headers.get("x-vercel-ip-country") ||
      headers.get("cf-ipcountry") ||
      headers.get("x-country-code")
  );

  if (fromHeader) {
    return NextResponse.json({
      code: fromHeader,
      name: getCountryName(fromHeader),
      source: "ip-header" as const,
    });
  }

  const forwarded = headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    null;
  const isLocal =
    !ip ||
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("172.");

  try {
    const url = isLocal
      ? "https://ipapi.co/json/"
      : `https://ipapi.co/${encodeURIComponent(ip)}/json/`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = (await res.json()) as GeoBody;
      if (!data.error) {
        const code = normalizeCode(data.country_code);
        if (code) {
          return NextResponse.json({
            code,
            name: getCountryName(code) || data.country || code,
            source: "ip-lookup" as const,
          });
        }
      }
    }
  } catch {
    // ignore — return empty suggestion
  }

  return NextResponse.json({
    code: null,
    name: null,
    source: "none" as const,
  });
}
