import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import { useVideoPlayer, VideoView } from "expo-video";
import { Pressable, StyleSheet, View } from "react-native";
import { useOptionalTheme } from "@/lib/theme-context";
import { colors as lightColors } from "@/lib/theme";
import {
  setCommunityVideoReelOpen,
  toggleCommunityVideoMuted,
  useCommunityVideoMuted,
  useCommunityVideoReelOpen,
} from "@/lib/community-video-sound";

function SoundChip({
  muted,
  onToggle,
}: {
  muted: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={muted ? "Activer le son" : "Couper le son"}
      hitSlop={8}
      onPress={onToggle}
      style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: "rgba(255,255,255,0.18)",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons
        name={muted ? "volume-mute" : "volume-medium"}
        size={22}
        color="#fff"
      />
    </Pressable>
  );
}

/** Feed video. Autoplay when on-screen (Android-style). Tap opens the vertical reel. */
export function CommunityVideoPlayer({
  url,
  edgeToEdge = false,
  inView = true,
  canHear = true,
  onOpenFeed,
}: {
  url: string;
  edgeToEdge?: boolean;
  inView?: boolean;
  canHear?: boolean;
  onOpenFeed?: (url: string) => void;
}) {
  const colors = useOptionalTheme()?.colors ?? lightColors;
  const muted = useCommunityVideoMuted();
  const reelOpen = useCommunityVideoReelOpen();
  const [ratio, setRatio] = useState(4 / 3);
  const [boxW, setBoxW] = useState(0);
  const player = useVideoPlayer({ uri: url }, (next) => {
    next.loop = true;
    next.muted = true;
    next.volume = 1;
    next.audioMixingMode = "mixWithOthers";
    next.pause();
  });

  useEffect(() => {
    const shouldPlay = inView && !reelOpen;
    const hear = shouldPlay && canHear && !muted;
    player.volume = 1;
    player.audioMixingMode = hear ? "doNotMix" : "mixWithOthers";
    player.muted = !hear;
    if (shouldPlay) {
      player.play();
    } else {
      player.pause();
    }
  }, [canHear, inView, muted, reelOpen, player]);

  useEffect(() => {
    function applySize(w?: number, h?: number) {
      if (!w || !h || h <= 0) return;
      setRatio(Math.min(16 / 9, Math.max(9 / 16, w / h)));
    }
    applySize(player.videoTrack?.size?.width, player.videoTrack?.size?.height);
    const onLoad = player.addListener("sourceLoad", (e) => {
      const size = e.availableVideoTracks?.[0]?.size ?? player.videoTrack?.size;
      applySize(size?.width, size?.height);
    });
    const onTrack = player.addListener("videoTrackChange", (e) => {
      applySize(e.videoTrack?.size?.width, e.videoTrack?.size?.height);
    });
    return () => {
      onLoad.remove();
      onTrack.remove();
    };
  }, [player]);

  const mediaH =
    boxW > 0 ? Math.min(420, Math.max(160, boxW / ratio)) : undefined;

  return (
    <View
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && Math.abs(w - boxW) > 1) setBoxW(w);
      }}
      style={{
        marginTop: edgeToEdge ? 0 : 10,
        width: "100%",
        aspectRatio: mediaH ? undefined : 4 / 3,
        height: mediaH,
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
        contentFit="cover"
        nativeControls={false}
        surfaceType="textureView"
      />
      <Pressable
        onPress={() => {
          setCommunityVideoReelOpen(true);
          player.pause();
          player.muted = true;
          onOpenFeed?.(url);
        }}
        style={[StyleSheet.absoluteFillObject, { zIndex: 1 }]}
      />
      <View style={{ position: "absolute", bottom: 10, right: 10, zIndex: 3 }}>
        <SoundChip
          muted={muted || !canHear}
          onToggle={() => {
            const nextMuted = !muted;
            toggleCommunityVideoMuted();
            const hear = inView && !reelOpen && canHear && !nextMuted;
            player.volume = 1;
            player.audioMixingMode = hear ? "doNotMix" : "mixWithOthers";
            player.muted = !hear;
            if (inView && !reelOpen) player.play();
          }}
        />
      </View>
    </View>
  );
}
