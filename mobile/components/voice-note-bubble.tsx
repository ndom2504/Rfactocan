import Ionicons from "@expo/vector-icons/Ionicons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useEffect, useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { colors } from "@/lib/theme";
import {
  formatVoiceTime,
  registerVoiceStopper,
  stopAllVoicePlayback,
  waveformFromKey,
} from "@/lib/voice";

export function VoiceNoteBubble({
  url,
  mine = false,
}: {
  url: string;
  mine?: boolean;
}) {
  const player = useAudioPlayer(url, { updateInterval: 200 });
  const status = useAudioPlayerStatus(player);
  const bars = useMemo(() => waveformFromKey(url), [url]);
  const progress =
    status.duration > 0 ? Math.min(1, status.currentTime / status.duration) : 0;
  const played = mine ? colors.white : colors.accent;
  const rest = mine ? "rgba(255,255,255,0.35)" : "rgba(27,59,20,0.25)";

  useEffect(() => {
    return registerVoiceStopper(() => {
      if (player.playing) player.pause();
    });
  }, [player]);

  function toggle() {
    if (status.playing) {
      player.pause();
      return;
    }
    stopAllVoicePlayback();
    player.play();
  }

  function seek(index: number) {
    if (status.duration <= 0) return;
    void player.seekTo((index / bars.length) * status.duration);
  }

  return (
    <View style={{ width: 230 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Pressable
          onPress={toggle}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: mine ? "rgba(255,255,255,0.2)" : colors.accent,
          }}
        >
          <Ionicons
            name={status.playing ? "pause" : "play"}
            size={18}
            color={colors.white}
          />
        </Pressable>
        <View style={{ flex: 1 }}>
          <View
            style={{
              height: 28,
              flexDirection: "row",
              alignItems: "flex-end",
              gap: 1,
            }}
          >
            {bars.map((h, i) => (
              <Pressable
                key={i}
                onPress={() => seek(i)}
                style={{
                  width: 3,
                  height: Math.max(4, Math.round(h * 28)),
                  borderRadius: 99,
                  backgroundColor: i / bars.length <= progress ? played : rest,
                }}
              />
            ))}
          </View>
          <Text
            style={{
              marginTop: 2,
              fontSize: 11,
              color: mine ? "rgba(255,255,255,0.8)" : colors.muted,
            }}
          >
            {formatVoiceTime(
              status.playing || progress > 0
                ? status.currentTime
                : status.duration
            )}
          </Text>
        </View>
      </View>
    </View>
  );
}
