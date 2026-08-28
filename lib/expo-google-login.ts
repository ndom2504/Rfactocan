import { prisma } from "@/lib/prisma";
import { isExpoGoogleSid } from "@/lib/google-mobile-oauth";

const TTL_MS = 5 * 60 * 1000;
const KEY_PREFIX = "expo-google:";

function settingKey(sid: string) {
  return `${KEY_PREFIX}${sid.trim().toLowerCase()}`;
}

export type ExpoGoogleUser = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  preferredCurrency?: string;
  avatarUrl?: string | null;
};

export type ExpoGoogleLoginPayload =
  | { error: string }
  | { mfaRequired: true; mfaToken: string; emailHint: string }
  | { token: string; user: ExpoGoogleUser };

type Stored = { exp: number; data: ExpoGoogleLoginPayload };

const memory = new Map<string, Stored>();

export function expoGoogleUserJson(user: {
  id: string;
  email: string;
  displayName: string;
  role: string;
  preferredCurrency?: string | null;
  avatarUrl?: string | null;
}): ExpoGoogleUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    preferredCurrency: user.preferredCurrency || "CAD",
    avatarUrl: user.avatarUrl,
  };
}

export async function saveExpoGoogleLogin(
  sid: string,
  data: ExpoGoogleLoginPayload
) {
  if (!isExpoGoogleSid(sid)) return;
  const stored: Stored = { exp: Date.now() + TTL_MS, data };
  const id = sid.trim().toLowerCase();
  memory.set(id, stored);
  const key = settingKey(sid);
  const value = JSON.stringify(stored);
  try {
    await prisma.appSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  } catch (error) {
    console.error("[expo-google] persist failed", error);
  }
}

export async function readExpoGoogleLogin(
  sid: string
): Promise<{ pending: true } | ExpoGoogleLoginPayload> {
  if (!isExpoGoogleSid(sid)) return { pending: true };
  const id = sid.trim().toLowerCase();
  const mem = memory.get(id);
  if (mem) {
    if (mem.exp < Date.now()) {
      memory.delete(id);
    } else {
      return mem.data;
    }
  }
  const key = settingKey(sid);
  try {
    const row = await prisma.appSetting.findUnique({
      where: { key },
      select: { value: true },
    });
    if (!row?.value) return { pending: true };
    const stored = JSON.parse(row.value) as Stored;
    if (!stored?.exp || stored.exp < Date.now() || !stored.data) {
      await prisma.appSetting.delete({ where: { key } }).catch(() => {});
      return { pending: true };
    }
    memory.set(id, stored);
    return stored.data;
  } catch {
    return { pending: true };
  }
}
