import { prisma } from "@/lib/prisma";

let initialized = false;

function getFirebaseCredentials() {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  let privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();
  if (privateKey?.includes("\\n")) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }
  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

export function isFcmConfigured() {
  return Boolean(getFirebaseCredentials());
}

async function ensureFirebaseMessaging() {
  const creds = getFirebaseCredentials();
  if (!creds) return null;

  const { initializeApp, getApps, cert } = await import("firebase-admin/app");
  const { getMessaging } = await import("firebase-admin/messaging");

  if (!initialized) {
    if (getApps().length === 0) {
      initializeApp({
        credential: cert({
          projectId: creds.projectId,
          clientEmail: creds.clientEmail,
          privateKey: creds.privateKey,
        }),
      });
    }
    initialized = true;
  }

  return getMessaging();
}

export async function sendFcmToUsers(input: {
  userIds: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}) {
  const uniqueIds = [...new Set(input.userIds)].filter(Boolean);
  if (uniqueIds.length === 0) return { sent: 0, skipped: true as const };

  const messaging = await ensureFirebaseMessaging();
  if (!messaging) {
    console.warn("[fcm] FIREBASE_* not configured — push skipped");
    return { sent: 0, skipped: true as const };
  }

  const tokens = await prisma.deviceToken.findMany({
    where: { userId: { in: uniqueIds } },
    select: { id: true, token: true },
  });
  if (tokens.length === 0) return { sent: 0, skipped: false as const };

  const invalidTokenIds: string[] = [];
  let sent = 0;
  const chunkSize = 500;

  for (let i = 0; i < tokens.length; i += chunkSize) {
    const chunk = tokens.slice(i, i + chunkSize);
    try {
      const res = await messaging.sendEachForMulticast({
        tokens: chunk.map((t) => t.token),
        notification: {
          title: input.title,
          body: input.body,
        },
        data: input.data,
        android: {
          priority: "high",
          notification: {
            channelId: "rfacto_jobs",
            sound: "default",
            priority: "high",
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },
      });
      sent += res.successCount;
      res.responses.forEach((r, idx) => {
        if (
          !r.success &&
          r.error &&
          (r.error.code === "messaging/registration-token-not-registered" ||
            r.error.code === "messaging/invalid-registration-token")
        ) {
          invalidTokenIds.push(chunk[idx].id);
        }
      });
    } catch (error) {
      console.error("[fcm] sendEachForMulticast failed", error);
    }
  }

  if (invalidTokenIds.length > 0) {
    await prisma.deviceToken.deleteMany({
      where: { id: { in: invalidTokenIds } },
    });
  }

  return { sent, skipped: false as const };
}
