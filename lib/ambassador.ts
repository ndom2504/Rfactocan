import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { getAppUrl } from "@/lib/app-url";
import { prisma } from "@/lib/prisma";

export const REF_COOKIE = "rfacto_ref";
export const REF_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCodeSegment(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return out;
}

/** Short unique agent code, e.g. RF-AB12CD */
export async function generateAgentCode(): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = `RF-${randomCodeSegment(6)}`;
    const existing = await prisma.user.findUnique({
      where: { agentCode: code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  throw new Error("Unable to generate unique agent code");
}

export function inviteUrlForCode(agentCode: string): string {
  return `${getAppUrl()}/register?ref=${encodeURIComponent(agentCode)}`;
}

export function normalizeAgentCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  if (!code || code.length > 32) return null;
  return code;
}

/** Active ambassador (isAmbassador + matching agentCode). */
export async function resolveActiveAmbassador(rawCode: string | null | undefined) {
  const code = normalizeAgentCode(rawCode);
  if (!code) return null;

  const ambassador = await prisma.user.findFirst({
    where: {
      agentCode: code,
      isAmbassador: true,
      status: "ACTIVE",
    },
    select: { id: true, agentCode: true, displayName: true },
  });

  return ambassador;
}

/** Resolve ref from body or referral cookie (create-only attribution). */
export async function resolveReferralFromRequest(
  refFromBody?: string | null
): Promise<string | null> {
  const fromBody = await resolveActiveAmbassador(refFromBody);
  if (fromBody) return fromBody.id;

  try {
    const cookieStore = await cookies();
    const fromCookie = cookieStore.get(REF_COOKIE)?.value;
    const ambassador = await resolveActiveAmbassador(fromCookie);
    return ambassador?.id ?? null;
  } catch {
    return null;
  }
}
