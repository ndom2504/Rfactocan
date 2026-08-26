import { useEffect } from "react";
import { Text, View } from "react-native";
import {
  AndroidAudioTypePresets,
  AudioSession,
  LiveKitRoom,
  useLocalParticipant,
} from "@livekit/react-native";
import { Button } from "@/components/ui";

function InCallBar({
  onHangUp,
  busy,
}: {
  onHangUp: () => void;
  busy?: boolean;
}) {
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();

  return (
    <View style={{ flexDirection: "row", gap: 12, justifyContent: "center" }}>
      <Button
        label={isMicrophoneEnabled ? "Couper le micro" : "Micro"}
        onPress={() =>
          void localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)
        }
      />
      <Button
        label="Raccrocher"
        variant="danger"
        onPress={onHangUp}
        disabled={busy}
      />
    </View>
  );
}

export function CallMedia({
  serverUrl,
  token,
  onHangUp,
  busy,
  onError,
}: {
  serverUrl: string;
  token: string;
  onHangUp: () => void;
  busy?: boolean;
  onError: (message: string) => void;
}) {
  useEffect(() => {
    let stopped = false;
    void (async () => {
      try {
        await AudioSession.configureAudio({
          android: {
            preferredOutputList: ["bluetooth", "headset", "earpiece", "speaker"],
            audioTypeOptions: AndroidAudioTypePresets.communication,
          },
          ios: { defaultOutput: "earpiece" },
        });
        await AudioSession.startAudioSession();
      } catch {
        if (!stopped) onError("Impossible d’activer l’audio.");
      }
    })();
    return () => {
      stopped = true;
      void AudioSession.stopAudioSession();
    };
  }, [onError]);

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect
      audio
      video={false}
      options={{ adaptiveStream: { pixelDensity: "screen" } }}
      onError={() => onError("Impossible de rejoindre l’appel.")}
    >
      <View style={{ alignItems: "center", gap: 8 }}>
        <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 14 }}>
          Connecté
        </Text>
        <InCallBar onHangUp={onHangUp} busy={busy} />
      </View>
    </LiveKitRoom>
  );
}
