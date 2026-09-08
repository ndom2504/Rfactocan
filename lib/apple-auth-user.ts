import { resolveActiveAmbassador } from "@/lib/ambassador";
import {
  applePlaceholderEmail,
  formatAppleDisplayName,
  type AppleFullName,
  type AppleProfile,
} from "@/lib/apple-oauth";
import { prisma } from "@/lib/prisma";

export type AppleAuthUserRow = {
  id: string;
  email: string;
  role: "SENDER" | "TRAVELER" | "BOTH" | "ADMIN";
  status: string;
  appleId: string | null;
  displayName: string;
  avatarUrl: string | null;
  preferredCurrency: string | null;
};

export async function upsertUserFromAppleProfile(
  profile: AppleProfile,
  options: { fullName?: AppleFullName | null; ref?: string | null } = {}
): Promise<
  | { ok: true; user: AppleAuthUserRow }
  | { ok: false; error: "suspended" | "failed" }
> {
  const email = profile.email?.toLowerCase() || null;
  const displayName = formatAppleDisplayName(options.fullName, email);

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { appleId: profile.sub },
        ...(email ? [{ email }] : []),
      ],
    },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      appleId: true,
      displayName: true,
      avatarUrl: true,
      preferredCurrency: true,
    },
  });

  if (existing?.status === "SUSPENDED") {
    return { ok: false, error: "suspended" };
  }

  if (!existing) {
    const ambassador = await resolveActiveAmbassador(options.ref);
    const user = await prisma.user.create({
      data: {
        email: email || applePlaceholderEmail(profile.sub),
        appleId: profile.sub,
        displayName,
        role: "BOTH",
        status: "ACTIVE",
        verifiedAt: new Date(),
        language: "fr",
        preferredCurrency: "CAD",
        ...(ambassador?.id ? { referredById: ambassador.id } : {}),
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        appleId: true,
        displayName: true,
        avatarUrl: true,
        preferredCurrency: true,
      },
    });
    return { ok: true, user };
  }

  const user = await prisma.user.update({
    where: { id: existing.id },
    data: {
      appleId: existing.appleId ?? profile.sub,
      verifiedAt: new Date(),
      ...(existing.displayName === "Membre Rfacto" &&
      displayName !== "Membre Rfacto"
        ? { displayName }
        : {}),
    },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      appleId: true,
      displayName: true,
      avatarUrl: true,
      preferredCurrency: true,
    },
  });

  return { ok: true, user };
}
