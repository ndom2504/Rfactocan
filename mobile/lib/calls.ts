import Constants from "expo-constants";
import { NativeModules } from "react-native";
import { api } from "@/lib/api";

export type CallPeer = {
  id?: string;
  displayName?: string | null;
  avatarUrl?: string | null;
};

export type ActiveCall = {
  id: string;
  threadId?: string;
  mediaType: "AUDIO" | "VIDEO" | string;
  status: string;
  direction?: "inbound" | "outbound" | string;
  peer?: CallPeer;
  missed?: boolean;
  durationMs?: number | null;
  createdAt?: string;
};

export type CallHistoryItem = ActiveCall & {
  threadId: string;
  createdAt: string;
  missed: boolean;
  durationMs?: number | null;
  endReason?: string | null;
  startedAt?: string | null;
  answeredAt?: string | null;
  endedAt?: string | null;
};

export type ThreadLastCall = {
  id: string;
  status: string;
  mediaType?: string;
  createdAt: string;
  direction?: "inbound" | "outbound" | string | null;
  missed?: boolean;
  durationMs?: number | null;
};

export function isExpoGo() {
  return (
    Constants.appOwnership === "expo" ||
    Constants.executionEnvironment === "storeClient"
  );
}

export function isLivekitNativeAvailable() {
  if (isExpoGo()) return false;
  try {
    return Boolean(
      (NativeModules as { WebRTCModule?: unknown }).WebRTCModule
    );
  } catch {
    return false;
  }
}

export function setupLivekitGlobals() {
  try {
    if (!isLivekitNativeAvailable()) return;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("@livekit/react-native").registerGlobals();
  } catch {
    /* Expo Go or missing native module */
  }
}

export function isVideoCall(mediaType?: string | null) {
  return (mediaType || "").toUpperCase() === "VIDEO";
}

export function isTerminalCallStatus(status?: string | null) {
  const s = (status || "").toUpperCase();
  return (
    s === "ENDED" ||
    s === "REJECTED" ||
    s === "CANCELED" ||
    s === "MISSED" ||
    s === "FAILED"
  );
}

export async function createOutgoingCall(
  threadId: string,
  mediaType: "AUDIO" | "VIDEO" = "AUDIO"
) {
  const data = await api<{ call: ActiveCall }>("/api/calls", {
    method: "POST",
    body: JSON.stringify({ threadId, mediaType }),
  });
  return data.call;
}

export async function fetchCall(callId: string): Promise<ActiveCall | null> {
  try {
    const data = await api<{ call?: ActiveCall }>(`/api/calls/${callId}`);
    return data.call ?? null;
  } catch {
    return null;
  }
}

export async function fetchInboundRinging(): Promise<ActiveCall | null> {
  try {
    const data = await api<{ calls?: ActiveCall[] }>(
      "/api/calls?status=RINGING&direction=inbound&limit=3"
    );
    return (data.calls ?? []).find((c) => c.status === "RINGING") ?? null;
  } catch {
    return null;
  }
}

export async function postCallAction(
  callId: string,
  action: "accept" | "reject" | "cancel" | "end"
): Promise<ActiveCall | null> {
  try {
    const data = await api<{ call?: ActiveCall }>(
      `/api/calls/${callId}/${action}`,
      { method: "POST" }
    );
    return data.call ?? null;
  } catch {
    return null;
  }
}

export async function fetchLivekitJoin(callId: string): Promise<{
  livekitUrl: string;
  token: string;
} | null> {
  try {
    const data = await api<{ livekitUrl?: string; token?: string }>(
      `/api/calls/${callId}/token`
    );
    if (!data.livekitUrl || !data.token) return null;
    return { livekitUrl: data.livekitUrl, token: data.token };
  } catch {
    return null;
  }
}

export type CallListFilter = "recent" | "missed" | "inbound" | "outbound";

export async function listCalls(
  limit = 50,
  filter: CallListFilter = "recent"
): Promise<CallHistoryItem[]> {
  try {
    const params = new URLSearchParams();
    params.set("limit", String(Math.min(Math.max(limit, 1), 100)));
    if (filter === "missed") params.set("missed", "1");
    if (filter === "inbound") params.set("direction", "inbound");
    if (filter === "outbound") params.set("direction", "outbound");
    const data = await api<{ calls?: CallHistoryItem[] }>(
      `/api/calls?${params.toString()}`
    );
    return data.calls ?? [];
  } catch {
    return [];
  }
}

export function callStatusPreviewKey(
  call: Pick<ThreadLastCall, "status" | "direction" | "missed">
):
  | "call_missed"
  | "call_outgoing"
  | "call_incoming"
  | "call_no_answer"
  | "call_canceled"
  | "call_ended_short"
  | "call_rejected"
  | "call_ringing_status" {
  const status = (call.status || "").toUpperCase();
  const inbound = call.direction === "inbound";
  if (call.missed || status === "MISSED") {
    return inbound ? "call_missed" : "call_no_answer";
  }
  if (status === "RINGING") return "call_ringing_status";
  if (status === "CANCELED") return "call_canceled";
  if (status === "REJECTED") return "call_rejected";
  if (status === "ENDED" || status === "ACCEPTED") {
    return inbound ? "call_incoming" : "call_outgoing";
  }
  if (status === "FAILED") return "call_no_answer";
  return inbound ? "call_incoming" : "call_outgoing";
}
