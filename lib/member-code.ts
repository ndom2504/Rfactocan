import { prisma } from "@/lib/prisma";

/** Handle built from the name shown in the app: "Maya Chen" → "MayaChen". */
export function memberHandle(name: string) {
  const words = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  return (words.join("") || "Membre").slice(0, 32);
}

export function handleMatchesName(code: string, name: string) {
  const base = memberHandle(name);
  return code === base || new RegExp(`^${escapeRegExp(base)}\\d+$`).test(code);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

async function claimHandle(userId: string, candidate: string) {
  const holder = await prisma.user.findUnique({
    where: { memberCode: candidate },
    select: { id: true },
  });
  if (holder && holder.id !== userId) return false;
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { memberCode: candidate },
    });
    return true;
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "";
    if (code === "P2002") return false;
    throw error;
  }
}

export async function ensureMemberCode(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { displayName: true, memberCode: true },
  });
  if (!user) return null;
  const base = memberHandle(user.displayName);
  if (user.memberCode === base) return base;
  if (await claimHandle(userId, base)) return base;
  if (user.memberCode && handleMatchesName(user.memberCode, user.displayName)) {
    return user.memberCode;
  }
  for (let n = 2; n < 100; n += 1) {
    const candidate = `${base}${n}`.slice(0, 40);
    if (await claimHandle(userId, candidate)) return candidate;
  }
  return user.memberCode;
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
