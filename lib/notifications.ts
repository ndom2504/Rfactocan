import { prisma } from "@/lib/prisma";
import { sendFcmToUsers } from "@/lib/fcm";

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
    void sendFcmToUsers({
      userIds: [input.userId],
      title: input.title,
      body: input.body,
      data: {
        type: input.type,
        href: input.href ?? "",
        ...(input.data ?? {}),
      },
    }).catch((error) => {
      console.error("[notification] fcm", error);
    });
    return row;
  } catch (error) {
    console.error("[notification]", error);
    return null;
  }
}
