import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { INVITE_COOKIE } from "@/lib/invite-cookie";

const SHARE_CRAWLER =
  /facebookexternalhit|Facebot|Twitterbot|WhatsApp|Slackbot|LinkedInBot|TelegramBot|Discordbot|Pinterest|iMessageBot/i;

function rewriteShareCrawler(request: NextRequest) {
  const ua = request.headers.get("user-agent") || "";
  if (!SHARE_CRAWLER.test(ua)) return null;

  const path = request.nextUrl.pathname;
  const community = /^\/community\/([^/]+)$/.exec(path);
  if (community) {
    const url = request.nextUrl.clone();
    url.pathname = `/share/community/${community[1]}`;
    return NextResponse.rewrite(url);
  }

  const shop = /^\/shops\/([^/]+)$/.exec(path);
  if (shop) {
    const url = request.nextUrl.clone();
    url.pathname = `/share/community/${encodeURIComponent(`shop:${shop[1]}`)}`;
    return NextResponse.rewrite(url);
  }

  const service = /^\/services\/listing\/([^/]+)$/.exec(path);
  if (service) {
    const url = request.nextUrl.clone();
    url.pathname = `/share/community/${encodeURIComponent(`svc:${service[1]}`)}`;
    return NextResponse.rewrite(url);
  }

  const trip = /^\/trips\/([^/]+)$/.exec(path);
  if (trip) {
    const url = request.nextUrl.clone();
    url.pathname = `/share/community/${encodeURIComponent(`trip:${trip[1]}`)}`;
    return NextResponse.rewrite(url);
  }

  return null;
}

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
      "Authorization, Content-Type, Accept, X-Requested-With, X-Rfacto-Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export function middleware(request: NextRequest) {
  const crawler = rewriteShareCrawler(request);
  if (crawler) return crawler;

  if (request.nextUrl.pathname === "/invite") {
    const inviterId = request.nextUrl.searchParams.get("u")?.trim() || "";
    const response = NextResponse.next();
    if (inviterId.length >= 8) {
      response.cookies.set(INVITE_COOKIE, inviterId, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        sameSite: "lax",
        httpOnly: true,
      });
    }
    return response;
  }

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
  const path = request.nextUrl.pathname;
  const cacheablePublicApi =
    path.startsWith("/api/media") ||
    path.startsWith("/api/corridors") ||
    path.startsWith("/api/public/");
  if (!cacheablePublicApi) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
  }
  return response;
}

export const config = {
  matcher: [
    "/api/:path*",
    "/invite",
    "/community/:id",
    "/shops/:id",
    "/services/listing/:id",
    "/trips/:id",
  ],
};
