import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { User, UserRole, UserStatus } from "@prisma/client";
import { isKycRequiredForCountry } from "@/lib/kyc-policy";

const COOKIE_NAME = "rfacto_session";
const SESSION_DAYS = 14;

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  verifiedAt: Date | null;
  kycStatus: User["kycStatus"];
  isAmbassador: boolean;
  agentCode: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  ratingAvg: number;
  ratingCount: number;
  preferredCurrency: string;
  country: string | null;
  kycRequired: boolean;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(
  user: Pick<User, "id" | "email" | "role">
) {
  return new SignJWT({ email: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/** Extract a JWT from Authorization / X-Rfacto-Authorization (Bearer optional). */
export function getBearerTokenFromHeader(
  authorization?: string | null
): string | null {
  if (!authorization) return null;
  let value = authorization.trim().replace(/^"+|"+$/g, "");
  while (/^Bearer\s+/i.test(value)) {
    value = value.replace(/^Bearer\s+/i, "").trim();
  }
  return value || null;
}

function bearerFromHeaderMap(getHeader: (name: string) => string | null) {
  return (
    getBearerTokenFromHeader(getHeader("authorization")) ||
    getBearerTokenFromHeader(getHeader("x-rfacto-authorization"))
  );
}

async function resolveSessionToken(
  request?: Request
): Promise<string | null> {
  if (request) {
    const fromRequest = bearerFromHeaderMap((name) =>
      request.headers.get(name)
    );
    if (fromRequest) return fromRequest;
  }

  const headerStore = await headers();
  const bearer = bearerFromHeaderMap((name) => headerStore.get(name));
  if (bearer) return bearer;

  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

export async function getSessionUserFromToken(
  token: string
): Promise<SessionUser | null> {
  return sessionUserFromToken(token);
}

async function sessionUserFromToken(
  token: string
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const userId = payload.sub;
    if (!userId) return null;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status === "SUSPENDED") return null;

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      status: user.status,
      verifiedAt: user.verifiedAt,
      kycStatus: user.kycStatus,
      isAmbassador: user.isAmbassador,
      agentCode: user.agentCode,
      avatarUrl: user.avatarUrl,
      bannerUrl: user.bannerUrl,
      ratingAvg: user.ratingAvg,
      ratingCount: user.ratingCount,
      preferredCurrency: user.preferredCurrency || "CAD",
      country: user.country,
      kycRequired: isKycRequiredForCountry(user.country),
    };
  } catch {
    return null;
  }
}

/** Avoid CDN caching of 401/session JSON (Android GET /api/profile). */
export const AUTH_API_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
} as const;

/**
 * Resolve the current user from Bearer token (mobile) or session cookie (web).
 * Pass the Route Handler `Request` so Authorization is read even if `headers()` omits it.
 */
export async function getSessionUser(
  request?: Request
): Promise<SessionUser | null> {
  const token = await resolveSessionToken(request);
  if (!token) return null;
  return sessionUserFromToken(token);
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export { COOKIE_NAME };
