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

const ROW_H = 44;
const WAVE_H = 28;

export function VoiceNoteBubble({
  url,
  mine = false,
  durationHintSec = 0,
}: {
  url: string;
  mine?: boolean;
  durationHintSec?: number;
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

  async function toggle() {
    if (status.playing) {
      player.pause();
      return;
    }
    stopAllVoicePlayback();
    const ended =
      status.didJustFinish ||
      (status.duration > 0 && status.currentTime >= status.duration - 0.2);
    if (ended) {
      await player.seekTo(0);
    }
    player.play();
  }

  function seek(index: number) {
    if (status.duration <= 0) return;
    void player.seekTo((index / bars.length) * status.duration);
  }

  const timeLabel = formatVoiceTime(
    status.playing || progress > 0
      ? status.currentTime
      : status.duration > 0
        ? status.duration
        : durationHintSec
  );

  return (
    <View
      style={{
        width: 230,
        height: ROW_H,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }}
    >
      <Pressable
        onPress={toggle}
        hitSlop={4}
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: mine ? "rgba(255,255,255,0.2)" : colors.accent,
        }}
      >
        <Ionicons
          name={status.playing ? "pause" : "play"}
          size={18}
          color={colors.white}
          style={{ marginLeft: status.playing ? 0 : 2 }}
        />
      </Pressable>
      <View
        style={{
          flex: 1,
          height: WAVE_H,
          flexDirection: "row",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        {bars.map((h, i) => {
          const barH = Math.max(4, Math.round(h * WAVE_H));
          return (
            <Pressable
              key={i}
              onPress={() => seek(i)}
              style={{
                width: 3,
                height: WAVE_H,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  width: 3,
                  height: barH,
                  borderRadius: 99,
                  backgroundColor:
                    i / bars.length <= progress ? played : rest,
                }}
              />
            </Pressable>
          );
        })}
      </View>
      <Text
        style={{
          fontSize: 11,
          lineHeight: 14,
          minWidth: 34,
          textAlign: "right",
          textAlignVertical: "center",
          includeFontPadding: false,
          color: mine ? "rgba(255,255,255,0.85)" : colors.muted,
        }}
      >
        {timeLabel}
      </Text>
    </View>
  );
}
