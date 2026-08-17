import { AccessToken, TrackSource } from "livekit-server-sdk";

export function livekitRoomName(callId: string) {
  return `rfacto-call-${callId}`;
}

export type LivekitConfig = {
  url: string;
  apiKey: string;
  apiSecret: string;
};

/** Server-only. Never send apiSecret to a client. */
export function getLivekitConfig(): LivekitConfig | null {
  const url = process.env.LIVEKIT_URL?.trim() || "";
  const apiKey = process.env.LIVEKIT_API_KEY?.trim() || "";
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim() || "";
  if (!url || !apiKey || !apiSecret) return null;
  return { url, apiKey, apiSecret };
}

export function livekitAudioGrant(roomName: string) {
  return {
    roomJoin: true as const,
    room: roomName,
    canPublish: true as const,
    canSubscribe: true as const,
    canPublishData: false as const,
    canPublishSources: [TrackSource.MICROPHONE],
  };
}

export async function createLivekitParticipantToken(input: {
  identity: string;
  name?: string;
  roomName: string;
  config: LivekitConfig;
}) {
  const at = new AccessToken(input.config.apiKey, input.config.apiSecret, {
    identity: input.identity,
    name: input.name,
    ttl: "2h",
  });
  at.addGrant(livekitAudioGrant(input.roomName));
  return at.toJwt();
}
