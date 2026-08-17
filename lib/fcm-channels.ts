/** Android FCM NotificationChannel ids. Must match JobAlertChannels on the app. */

export const FCM_CHANNEL_MESSAGES = "rfacto_messages_v3";
export const FCM_CHANNEL_ALERTS = "rfacto_alerts_v3";
export const FCM_CHANNEL_JOBS = "rfacto_jobs_v3";
export const FCM_CHANNEL_CALLS = "rfacto_calls_v1";

export function isIncomingCallType(type?: string | null) {
  return (type ?? "").toUpperCase() === "INCOMING_CALL";
}

export function isFcmMessageType(type?: string | null) {
  const t = (type ?? "").toUpperCase();
  return t === "MESSAGE" || t === "DIRECT_MESSAGE" || t === "DM" || t.includes("MESSAGE");
}

export function isFcmJobType(type?: string | null) {
  const t = (type ?? "").toUpperCase();
  return t === "NEARBY_REQUEST" || t === "NEARBY_SERVICE" || t.includes("NEARBY");
}

export function androidChannelIdForType(type?: string | null) {
  if (isIncomingCallType(type)) return FCM_CHANNEL_CALLS;
  if (isFcmMessageType(type)) return FCM_CHANNEL_MESSAGES;
  if (isFcmJobType(type)) return FCM_CHANNEL_JOBS;
  return FCM_CHANNEL_ALERTS;
}

/** Incoming-call FCM should not outlive the 45s RINGING window. */
export function androidTtlMsForType(type?: string | null) {
  if (isIncomingCallType(type)) return 45_000;
  return 86_400_000;
}
