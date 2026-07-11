import type { GoogleProfile } from "@/lib/google-oauth";
import { prisma } from "@/lib/prisma";

export type GoogleAuthUserRow = {
  id: string;
  email: string;
  role: "SENDER" | "TRAVELER" | "BOTH" | "ADMIN";
  status: string;
  googleId: string | null;
  displayName: string;
  avatarUrl: string | null;
  verifiedAt: Date | null;
  preferredCurrency: string | null;
};

/**
 * Find or create a user from a verified Google profile (web OAuth + mobile ID token).
 */
export async function upsertUserFromGoogleProfile(
  profile: GoogleProfile
): Promise<
  | { ok: true; user: GoogleAuthUserRow }
  | { ok: false; error: "email_required" | "email_unverified" | "suspended" | "failed" }
> {
  if (!profile.email) {
    return { ok: false, error: "email_required" };
  }

  if (profile.email_verified === false) {
    return { ok: false, error: "email_unverified" };
  }

  const email = profile.email.toLowerCase();
  const displayName = profile.name || email.split("@")[0];

  const existing = await prisma.$queryRaw<GoogleAuthUserRow[]>`
    SELECT id, email, role, status, "googleId", "displayName", "avatarUrl", "verifiedAt", "preferredCurrency"
    FROM "User"
    WHERE "googleId" = ${profile.sub} OR email = ${email}
    LIMIT 1
  `;

  let user = existing[0];

  if (user?.status === "SUSPENDED") {
    return { ok: false, error: "suspended" };
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
    const created = await prisma.$queryRaw<GoogleAuthUserRow[]>`
      SELECT id, email, role, status, "googleId", "displayName", "avatarUrl", "verifiedAt", "preferredCurrency"
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
    const updated = await prisma.$queryRaw<GoogleAuthUserRow[]>`
      SELECT id, email, role, status, "googleId", "displayName", "avatarUrl", "verifiedAt", "preferredCurrency"
      FROM "User" WHERE id = ${user.id} LIMIT 1
    `;
    user = updated[0];
  }

  if (!user) {
    return { ok: false, error: "failed" };
  }

  return { ok: true, user };
}
