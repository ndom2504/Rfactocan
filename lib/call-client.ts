export type CallPeer = {
  id?: string;
  displayName: string;
  avatarUrl?: string | null;
};

export type ActiveCall = {
  id: string;
  threadId?: string;
  mediaType: "AUDIO" | "VIDEO" | string;
  status: string;
  direction: "inbound" | "outbound" | string;
  peer?: CallPeer;
};

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

export async function fetchCall(callId: string): Promise<ActiveCall | null> {
  const res = await fetch(`/api/calls/${callId}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.call) return null;
  return data.call as ActiveCall;
}

export async function fetchInboundRinging(): Promise<ActiveCall | null> {
  const res = await fetch(
    "/api/calls?status=RINGING&direction=inbound&limit=3"
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return null;
  const calls = (data.calls ?? []) as ActiveCall[];
  return calls.find((c) => c.status === "RINGING") ?? null;
}

export async function postCallAction(
  callId: string,
  action: "accept" | "reject" | "cancel" | "end"
): Promise<ActiveCall | null> {
  const res = await fetch(`/api/calls/${callId}/${action}`, { method: "POST" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return null;
  return (data.call as ActiveCall) ?? null;
}

export async function fetchLivekitJoin(callId: string): Promise<{
  livekitUrl: string;
  token: string;
} | null> {
  const res = await fetch(`/api/calls/${callId}/token`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.livekitUrl || !data.token) return null;
  return { livekitUrl: data.livekitUrl, token: data.token };
}
