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
