/** Expo Push Service — iOS TestFlight / App Store tokens (`ExponentPushToken[...]`). */

import { prisma } from "@/lib/prisma";

export function isExpoPushToken(token?: string | null) {
  return Boolean(token && token.startsWith("ExponentPushToken["));
}

type ExpoMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: "default" | null;
  badge?: number;
  channelId?: string;
  priority?: "default" | "normal" | "high";
  ttl?: number;
  interruptionLevel?: "active" | "critical" | "passive" | "time-sensitive";
  /** Only for silent/background wake — do NOT set on normal alerts or iOS may hide the banner. */
  _contentAvailable?: boolean;
};

type ExpoTicket = {
  status?: string;
  id?: string;
  message?: string;
  details?: { error?: string };
};

export async function sendExpoPushToTokens(input: {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  channelId?: string;
  ttlSeconds?: number;
  incomingCall?: boolean;
}) {
  const unique = [...new Set(input.tokens)].filter(isExpoPushToken);
  if (unique.length === 0) return { sent: 0 };

  // Visible alert for messages. content-available alone = silent (no banner) on iOS.
  // Only wake silently for incoming-call handoff when we also need background fetch.
  const messages: ExpoMessage[] = unique.map((to) => ({
    to,
    title: input.title,
    body: input.body,
    data: input.data,
    sound: "default",
    badge: 1,
    channelId: input.channelId,
    priority: "high",
    ttl: input.ttlSeconds,
    interruptionLevel: input.incomingCall ? "time-sensitive" : "active",
    ...(input.incomingCall ? { _contentAvailable: true } : {}),
  }));

  let sent = 0;
  const invalidTokens: string[] = [];
  const chunkSize = 100;
  for (let i = 0; i < messages.length; i += chunkSize) {
    const chunk = messages.slice(i, i + chunkSize);
    try {
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk),
      });
      if (!res.ok) {
        console.error("[expo-push] HTTP", res.status, await res.text());
        continue;
      }
      const json = (await res.json()) as { data?: ExpoTicket[] };
      const tickets = json.data ?? [];
      tickets.forEach((ticket, idx) => {
        if (ticket.status === "ok") {
          sent += 1;
          return;
        }
        const err = ticket.details?.error || ticket.message || "unknown";
        console.error("[expo-push] ticket error", err, chunk[idx]?.to?.slice(0, 32));
        if (
          err === "DeviceNotRegistered" ||
          err === "InvalidCredentials" ||
          /not.?registered/i.test(err)
        ) {
          invalidTokens.push(chunk[idx].to);
        }
      });
    } catch (error) {
      console.error("[expo-push] send failed", error);
    }
  }

  if (invalidTokens.length > 0) {
    await prisma.deviceToken
      .deleteMany({ where: { token: { in: invalidTokens } } })
      .catch((error) => console.error("[expo-push] prune tokens", error));
  }

  return { sent };
}
