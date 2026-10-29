import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  Share,
  Text,
  View,
  type ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";
import { File, Paths } from "expo-file-system";
import { getApiUrl } from "@/lib/api";
import { getCommunityVideoFeed, type CommunityFeedVideo } from "@/lib/community-video-feed";
import {
  isCommunityVideoFavorite,
  toggleCommunityVideoFavorite,
} from "@/lib/community-video-favorites";
import {
  setCommunityVideoReelOpen,
  toggleCommunityVideoMuted,
  useCommunityVideoMuted,
} from "@/lib/community-video-sound";
import { useI18n } from "@/lib/i18n";

const { height: WINDOW_HEIGHT } = Dimensions.get("window");

function ReelAction({
  icon,
  label,
  active,
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={{ alignItems: "center", gap: 4 }}>
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: "rgba(255,255,255,0.16)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={24} color={active ? "#FF4D6D" : "#fff"} />
      </View>
      <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

function ReelPage({
  item,
  active,
  muted,
}: {
  item: CommunityFeedVideo;
  active: boolean;
  muted: boolean;
}) {
  const { t } = useI18n();
  const player = useVideoPlayer({ uri: item.url }, (next) => {
    next.loop = true;
    next.muted = true;
    next.volume = 1;
    next.audioMixingMode = "doNotMix";
    next.pause();
  });
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    void isCommunityVideoFavorite(item.url).then(setFavorite);
  }, [item.url]);

  useEffect(() => {
    const silent = muted || !active;
    player.audioMixingMode = silent ? "mixWithOthers" : "doNotMix";
    player.volume = 1;
    player.muted = silent;
    if (active) {
      player.play();
    } else {
      player.pause();
    }
  }, [active, muted, player]);

  useEffect(() => {
    return () => {
      try {
        player.pause();
        player.muted = true;
      } catch {
        /* already released */
      }
    };
  }, [player]);

  async function download() {
    try {
      const name = `rfacto-${Date.now()}.mp4`;
      const dest = new File(Paths.document, name);
      await File.downloadFileAsync(item.url, dest);
      await Share.share({
        url: dest.uri,
        title: t("download_attachment"),
      });
    } catch {
      await Share.share({ url: item.url, message: item.url, title: t("download_attachment") });
    }
  }

  return (
    <View style={{ height: WINDOW_HEIGHT, width: "100%", backgroundColor: "#000" }}>
      <VideoView
        player={player}
        style={{ width: "100%", height: "100%" }}
        contentFit="contain"
        nativeControls={false}
        surfaceType="textureView"
      />
      {item.authorName || item.caption ? (
        <View
          style={{
            position: "absolute",
            left: 16,
            right: 88,
            bottom: 40,
          }}
        >
          {item.authorName ? (
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>
              {item.authorName}
            </Text>
          ) : null}
          {item.caption ? (
            <Text style={{ color: "#fff", marginTop: 6, fontSize: 14 }} numberOfLines={3}>
              {item.caption}
            </Text>
          ) : null}
        </View>
      ) : null}
      <View
        style={{
          position: "absolute",
          right: 12,
          bottom: 36,
          alignItems: "center",
          gap: 14,
        }}
      >
        <ReelAction
          icon={favorite ? "heart" : "heart-outline"}
          label={t("video_favorite")}
          active={favorite}
          onPress={() => {
            void toggleCommunityVideoFavorite(item.url).then(setFavorite);
          }}
        />
        <ReelAction
          icon="download-outline"
          label={t("download_attachment")}
          onPress={() => void download()}
        />
        <ReelAction
          icon="share-social-outline"
          label={t("community_share")}
          onPress={() => {
            const link = item.postId
              ? `${getApiUrl()}/share/community/${encodeURIComponent(item.postId)}`
              : item.url;
            void Share.share({
              message: `${item.authorName || "Rfacto"}\n${item.caption}\n${link}`,
              url: link,
            });
          }}
        />
        <ReelAction
          icon={muted ? "volume-mute" : "volume-medium"}
          label="Son"
          onPress={toggleCommunityVideoMuted}
        />
      </View>
    </View>
  );
}

export default function CommunityVideosScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const seed = useMemo(() => getCommunityVideoFeed(), []);
  const muted = useCommunityVideoMuted();
  const [activeIndex, setActiveIndex] = useState(seed.startIndex);

  useEffect(() => {
    setCommunityVideoReelOpen(true);
    return () => setCommunityVideoReelOpen(false);
  }, []);
  const viewability = useRef({
    itemVisiblePercentThreshold: 80,
  }).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const top = [...viewableItems]
        .filter((item) => typeof item.index === "number" && item.isViewable)
        .sort((a, b) => (b.percentVisible ?? 0) - (a.percentVisible ?? 0))[0];
      if (typeof top?.index === "number") setActiveIndex(top.index);
    }
  ).current;

  if (seed.videos.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000", justifyContent: "center" }}>
        <Text style={{ color: "#fff", textAlign: "center" }}>{t("community_empty")}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <FlatList
        data={seed.videos}
        extraData={`${activeIndex}-${muted}`}
        keyExtractor={(item) => item.url}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        initialScrollIndex={seed.startIndex}
        windowSize={3}
        maxToRenderPerBatch={2}
        removeClippedSubviews
        getItemLayout={(_, index) => ({
          length: WINDOW_HEIGHT,
          offset: WINDOW_HEIGHT * index,
          index,
        })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewability}
        renderItem={({ item, index }) =>
          Math.abs(index - activeIndex) <= 1 ? (
            <ReelPage item={item} active={index === activeIndex} muted={muted} />
          ) : (
            <View style={{ height: WINDOW_HEIGHT, width: "100%", backgroundColor: "#000" }} />
          )
        }
      />
      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        style={{
          position: "absolute",
          top: insets.top + 8,
          left: 12,
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: "rgba(0,0,0,0.4)",
          alignItems: "center",
          justifyContent: "center",
        }}
        accessibilityLabel={t("close")}
      >
        <Ionicons name="close" size={22} color="#fff" />
      </Pressable>
    </View>
  );
}
