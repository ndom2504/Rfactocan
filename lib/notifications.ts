import { prisma } from "@/lib/prisma";
import { sendFcmToUsers } from "@/lib/fcm";
import { scheduleBackground } from "@/lib/schedule";

/**
 * Persist an in-app notification and deliver push to the user's devices.
 * Always await the push send: on Vercel, unfinished async work is frozen when
 * the HTTP response finishes — that was killing iOS Expo pushes.
 */
export async function notifyUser(input: {
  userId: string;
  type: string;
  title: string;
  body: string;
  href?: string;
  data?: Record<string, string>;
}) {
  try {
    const row = await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        href: input.href,
      },
    });
    try {
      const push = await sendFcmToUsers({
        userIds: [input.userId],
        title: input.title,
        body: input.body,
        data: {
          type: input.type,
          href: input.href ?? "",
          ...(input.data ?? {}),
        },
      });
      if (push.sent === 0) {
        console.warn("[notification] push sent=0", {
          userId: input.userId,
          type: input.type,
          skipped: push.skipped,
        });
      }
    } catch (error) {
      console.error("[notification] fcm", error);
    }
    return row;
  } catch (error) {
    console.error("[notification]", error);
    return null;
  }
}

/** Fire notifyUser without blocking the route — keeps running via waitUntil on Vercel. */
export function notifyUserBackground(
  input: Parameters<typeof notifyUser>[0]
) {
  scheduleBackground(notifyUser(input));
}
