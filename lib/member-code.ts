import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function randomMemberCode() {
  const bytes = randomBytes(4);
  let code = "RF";
  for (let i = 0; i < 4; i += 1) {
    code += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return code;
}

export function stripMemberCode(name: string, code?: string | null) {
  const trimmed = name.trim();
  if (!code) return trimmed;
  const suffix = ` · ${code}`;
  return trimmed.endsWith(suffix)
    ? trimmed.slice(0, -suffix.length).trim()
    : trimmed;
}

export function publicDisplayName(name: string, code?: string | null) {
  const base = stripMemberCode(name, code);
  return code ? `${base} · ${code}` : base;
}

export function shownMemberName(user: {
  displayName: string;
  memberCode?: string | null;
  email?: string | null;
}) {
  if (user.email?.toLowerCase().endsWith("@rfacto.local")) {
    return user.displayName;
  }
  return publicDisplayName(user.displayName, user.memberCode);
}

export async function ensureMemberCode(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { memberCode: true },
  });
  if (!user) return null;
  if (user.memberCode) return user.memberCode;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const memberCode = randomMemberCode();
    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { memberCode },
        select: { memberCode: true },
      });
      return updated.memberCode;
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : "";
      if (code !== "P2002") throw error;
    }
  }
  return null;
}

export async function ensureMissingMemberCodes(limit = 200) {
  const missing = await prisma.user.findMany({
    where: { memberCode: null, status: "ACTIVE" },
    select: { id: true },
    take: limit,
  });
  for (const row of missing) {
    await ensureMemberCode(row.id);
  }
  return missing.length;
}
