import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { User, UserRole, UserStatus } from "@prisma/client";

const COOKIE_NAME = "rfacto_session";
const SESSION_DAYS = 14;

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  verifiedAt: Date | null;
  avatarUrl: string | null;
  ratingAvg: number;
  ratingCount: number;
  preferredCurrency: string;
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

/** Extract Bearer token from an Authorization header value. */
export function getBearerTokenFromHeader(
  authorization?: string | null
): string | null {
  if (!authorization) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match?.[1]?.trim() || null;
}

async function resolveSessionToken(): Promise<string | null> {
  const headerStore = await headers();
  const bearer = getBearerTokenFromHeader(headerStore.get("authorization"));
  if (bearer) return bearer;

  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
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
      avatarUrl: user.avatarUrl,
      ratingAvg: user.ratingAvg,
      ratingCount: user.ratingCount,
      preferredCurrency: user.preferredCurrency || "CAD",
    };
  } catch {
    return null;
  }
}

/**
 * Resolve the current user from Bearer token (mobile) or session cookie (web).
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = await resolveSessionToken();
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
