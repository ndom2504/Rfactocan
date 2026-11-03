import { cookies } from "next/headers";
import { INVITE_COOKIE } from "@/lib/invite-cookie";
import { prisma } from "@/lib/prisma";

export { INVITE_COOKIE };

/** Persist inviter user id so signup/login can create a connection. */
export async function setInviteUserCookie(userId: string) {
  const jar = await cookies();
  jar.set(INVITE_COOKIE, userId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
    httpOnly: true,
  });
}

export async function readInviteUserId(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(INVITE_COOKIE)?.value?.trim() || "";
  return raw.length >= 8 ? raw : null;
}

export async function clearInviteUserCookie() {
  const jar = await cookies();
  jar.delete(INVITE_COOKIE);
}

/**
 * After signup/login: new user follows the inviter (connection).
 * Idempotent. Clears the cookie when done.
 */
export async function applyInviteConnection(
  newUserId: string,
  inviteFromBody?: string | null
) {
  const fromBody = inviteFromBody?.trim() || "";
  const inviterId =
    (fromBody.length >= 8 ? fromBody : null) || (await readInviteUserId());
  if (!inviterId || inviterId === newUserId) {
    await clearInviteUserCookie();
    return { connected: false as const };
  }
  const inviter = await prisma.user.findUnique({
    where: { id: inviterId },
    select: { id: true },
  });
  if (!inviter) {
    await clearInviteUserCookie();
    return { connected: false as const };
  }
  try {
    await prisma.userConnection.upsert({
      where: {
        followerId_followingId: {
          followerId: newUserId,
          followingId: inviterId,
        },
      },
      create: { followerId: newUserId, followingId: inviterId },
      update: {},
    });
  } catch (error) {
    console.error("[invite] connection", error);
    return { connected: false as const };
  }
  await clearInviteUserCookie();
  return { connected: true as const, inviterId };
}
