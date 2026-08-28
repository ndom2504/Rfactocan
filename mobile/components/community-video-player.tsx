import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import { useVideoPlayer, VideoView } from "expo-video";
import { Pressable, View } from "react-native";
import { useOptionalTheme } from "@/lib/theme-context";
import { colors as lightColors } from "@/lib/theme";

/** Feed video with sound. Native controls + a mute toggle. */
export function CommunityVideoPlayer({
  url,
  edgeToEdge = false,
}: {
  url: string;
  edgeToEdge?: boolean;
}) {
  const colors = useOptionalTheme()?.colors ?? lightColors;
  const player = useVideoPlayer({ uri: url }, (next) => {
    next.loop = true;
    next.muted = false;
    next.volume = 1;
  });
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const playing = player.addListener("playingChange", ({ isPlaying }) => {
      if (isPlaying && player.muted) {
        player.muted = false;
        player.volume = 1;
        setMuted(false);
      }
    });
    const muteSub = player.addListener("mutedChange", ({ muted: nextMuted }) => {
      setMuted(nextMuted);
    });
    return () => {
      playing.remove();
      muteSub.remove();
    };
  }, [player]);

  return (
    <View
      style={{
        marginTop: edgeToEdge ? 0 : 10,
        width: "100%",
        aspectRatio: 16 / 9,
        borderRadius: edgeToEdge ? 0 : 12,
        overflow: "hidden",
        backgroundColor: "#000",
        borderWidth: edgeToEdge ? 0 : 1,
        borderColor: colors.border,
      }}
    >
      <VideoView
        player={player}
        style={{ width: "100%", height: "100%" }}
        contentFit="contain"
        nativeControls
        fullscreenOptions={{ enable: true }}
        surfaceType="textureView"
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={muted ? "Activer le son" : "Couper le son"}
        hitSlop={8}
        onPress={() => {
          const next = !player.muted;
          player.muted = next;
          if (!next) player.volume = 1;
          setMuted(next);
        }}
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: "rgba(0,0,0,0.62)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons
          name={muted ? "volume-mute" : "volume-high"}
          size={22}
          color="#fff"
        />
      </Pressable>
    </View>
  );
}
