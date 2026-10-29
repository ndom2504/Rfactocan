/** Expo Push Service — iOS TestFlight tokens (`ExponentPushToken[...]`). */

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
  _contentAvailable?: boolean;
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
    _contentAvailable: true,
  }));

  let sent = 0;
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
      const json = (await res.json()) as {
        data?: Array<{ status?: string }>;
      };
      sent += (json.data ?? []).filter((row) => row.status === "ok").length;
    } catch (error) {
      console.error("[expo-push] send failed", error);
    }
  }
  return { sent };
}
