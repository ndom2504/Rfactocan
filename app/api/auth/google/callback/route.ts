import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAppUrl } from "@/lib/app-url";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import {
  exchangeGoogleCode,
  fetchGoogleProfile,
} from "@/lib/google-oauth";
import { prisma } from "@/lib/prisma";

const STATE_COOKIE = "rfacto_oauth_state";

type UserRow = {
  id: string;
  email: string;
  role: "SENDER" | "TRAVELER" | "BOTH" | "ADMIN";
  status: string;
  googleId: string | null;
  displayName: string;
  avatarUrl: string | null;
  verifiedAt: Date | null;
};

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

    if (!profile.email) {
      return NextResponse.redirect(
        new URL("/login?error=google_email_required", appUrl)
      );
    }

    if (profile.email_verified === false) {
      return NextResponse.redirect(
        new URL("/login?error=google_email_unverified", appUrl)
      );
    }

    const email = profile.email.toLowerCase();
    const displayName = profile.name || email.split("@")[0];

    const existing = await prisma.$queryRaw<UserRow[]>`
      SELECT id, email, role, status, "googleId", "displayName", "avatarUrl", "verifiedAt"
      FROM "User"
      WHERE "googleId" = ${profile.sub} OR email = ${email}
      LIMIT 1
    `;

    let user = existing[0];

    if (user?.status === "SUSPENDED") {
      return NextResponse.redirect(
        new URL("/login?error=account_suspended", appUrl)
      );
    }

    if (!user) {
      const id = `g_${profile.sub.slice(0, 24)}`;
      await prisma.$executeRaw`
        INSERT INTO "User" (
          id, email, "googleId", "displayName", "avatarUrl", role, status,
          "preferredCurrency", "verifiedAt", "ratingAvg", "ratingCount",
          "createdAt", "updatedAt"
        ) VALUES (
          ${id}, ${email}, ${profile.sub}, ${displayName}, ${profile.picture ?? null},
          'BOTH', 'ACTIVE', 'CAD', NOW(), 0, 0, NOW(), NOW()
        )
      `;
      const created = await prisma.$queryRaw<UserRow[]>`
        SELECT id, email, role, status, "googleId", "displayName", "avatarUrl", "verifiedAt"
        FROM "User" WHERE id = ${id} LIMIT 1
      `;
      user = created[0];
    } else {
      await prisma.$executeRaw`
        UPDATE "User"
        SET
          "googleId" = COALESCE("googleId", ${profile.sub}),
          "avatarUrl" = COALESCE("avatarUrl", ${profile.picture ?? null}),
          "verifiedAt" = COALESCE("verifiedAt", NOW()),
          "updatedAt" = NOW()
        WHERE id = ${user.id}
      `;
      const updated = await prisma.$queryRaw<UserRow[]>`
        SELECT id, email, role, status, "googleId", "displayName", "avatarUrl", "verifiedAt"
        FROM "User" WHERE id = ${user.id} LIMIT 1
      `;
      user = updated[0];
    }

    if (!user) {
      return NextResponse.redirect(
        new URL("/login?error=google_auth_failed", appUrl)
      );
    }

    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    await setSessionCookie(token);

    const next =
      saved.next.startsWith("/") && !saved.next.startsWith("//")
        ? saved.next
        : "/dashboard";

    return NextResponse.redirect(new URL(next, appUrl));
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/login?error=google_auth_failed", appUrl)
    );
  }
}
