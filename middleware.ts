import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function corsHeaders(request: NextRequest) {
  const configured = process.env.MOBILE_CORS_ORIGIN?.trim();
  const origin = request.headers.get("origin") ?? "";
  const allowOrigin =
    configured === "*" || !configured
      ? "*"
      : configured.split(",").map((s) => s.trim()).includes(origin)
        ? origin
        : configured.split(",")[0]?.trim() || "*";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers":
      "Authorization, Content-Type, Accept, X-Requested-With",
    "Access-Control-Max-Age": "86400",
  };
}

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const headers = corsHeaders(request);

  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers });
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
