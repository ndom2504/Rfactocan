/** Expo Push Service — iOS TestFlight / App Store tokens. */

import { prisma } from "@/lib/prisma";
import { scheduleBackground } from "@/lib/schedule";

export function isExpoPushToken(token?: string | null) {
  if (!token) return false;
  return (
    ((token.startsWith("ExponentPushToken[") ||
      token.startsWith("ExpoPushToken[")) &&
      token.endsWith("]")) ||
    /^[a-z\d]{8}-[a-z\d]{4}-[a-z\d]{4}-[a-z\d]{4}-[a-z\d]{12}$/i.test(token)
  );
}

type ExpoMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound: "default";
  priority: "high";
  badge?: number;
  ttl?: number;
};

/**
 * Visible iOS alert. channelId is Android-only and is not sent.
 * interruptionLevel and _contentAvailable are omitted: without the
 * Time Sensitive entitlement, or with a silent content-available wake,
 * APNs accepts the ticket then shows nothing while the app is backgrounded.
 */
export function buildExpoAlertMessage(input: {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  ttlSeconds?: number;
}): ExpoMessage {
  const data: Record<string, string> = {};
  for (const [key, value] of Object.entries(input.data ?? {})) {
    if (key === "title" || key === "body" || key === "channelId") continue;
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    data[key] = trimmed.slice(0, 500);
  }
  const message: ExpoMessage = {
    to: input.to,
    title: input.title.trim() || "Rfacto",
    body: input.body.trim() || "Nouveau message",
    sound: "default",
    priority: "high",
    badge: 1,
  };
  if (Object.keys(data).length > 0) message.data = data;
  if (input.ttlSeconds && input.ttlSeconds > 0) message.ttl = input.ttlSeconds;
  return message;
}

type ExpoTicket = {
  status?: string;
  id?: string;
  message?: string;
  details?: { error?: string };
};

async function fetchExpoReceipts(ticketIds: string[]) {
  const ids = ticketIds.filter(Boolean);
  if (ids.length === 0) return;
  try {
    const res = await fetch("https://exp.host/--/api/v2/push/getReceipts", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) {
      console.error("[expo-push] receipts HTTP", res.status, await res.text());
      return;
    }
    const json = (await res.json()) as {
      data?: Record<string, ExpoTicket>;
    };
    const invalidTokens: string[] = [];
    for (const [id, receipt] of Object.entries(json.data ?? {})) {
      if (receipt.status === "ok") continue;
      const err = receipt.details?.error || receipt.message || "unknown";
      console.error("[expo-push] receipt error", id, err, receipt.message);
      if (err === "InvalidCredentials") {
        console.error(
          "[expo-push] InvalidCredentials — upload an Apple Push Key in EAS credentials (eas credentials → iOS → Push Notifications)."
        );
      }
      if (err === "DeviceNotRegistered" || /not.?registered/i.test(err)) {
        /* token unknown at receipt stage; pruned via ticket path when possible */
      }
    }
    if (invalidTokens.length) {
      await prisma.deviceToken.deleteMany({
        where: { token: { in: invalidTokens } },
      });
    }
  } catch (error) {
    console.error("[expo-push] receipts failed", error);
  }
}

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

  const messages = unique.map((to) =>
    buildExpoAlertMessage({
      to,
      title: input.title,
      body: input.body,
      data: input.data,
      ttlSeconds: input.ttlSeconds,
    })
  );

  let sent = 0;
  const invalidTokens: string[] = [];
  const ticketIds: string[] = [];
  const chunkSize = 100;
  for (let i = 0; i < messages.length; i += chunkSize) {
    const chunk = messages.slice(i, i + chunkSize);
    try {
      const headers: Record<string, string> = {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      };
      const accessToken = process.env.EXPO_ACCESS_TOKEN?.trim();
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers,
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
          if (ticket.id) ticketIds.push(ticket.id);
          return;
        }
        const err = ticket.details?.error || ticket.message || "unknown";
        console.error(
          "[expo-push] ticket error",
          err,
          chunk[idx]?.to?.slice(0, 40)
        );
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

  // Receipts diagnose APNs credential issues without delaying the chat response.
  if (ticketIds.length > 0) {
    scheduleBackground(
      (async () => {
        await new Promise((r) => setTimeout(r, 4000));
        await fetchExpoReceipts(ticketIds);
      })()
    );
  }

  return { sent };
}
