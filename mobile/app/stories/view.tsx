import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, mediaUrl } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { formatStoryViews, isStatusVideoUrl } from "@/lib/member-status";
import {
  clearStoryFeed,
  getStoryFeed,
  type StoryFeedItem,
} from "@/lib/story-feed";

const PHOTO_MS = 5200;
const { width: W, height: H } = Dimensions.get("window");

function StoryVideo({
  uri,
  paused,
  onEnded,
}: {
  uri: string;
  paused: boolean;
  onEnded: () => void;
}) {
  const player = useVideoPlayer({ uri }, (p) => {
    p.loop = false;
    p.muted = false;
    p.volume = 1;
    p.audioMixingMode = "doNotMix";
  });

  useEffect(() => {
    if (paused) player.pause();
    else player.play();
  }, [paused, player]);

  useEffect(() => {
    const sub = player.addListener("playToEnd", () => onEnded());
    return () => sub.remove();
  }, [player, onEnded]);

  return (
    <VideoView
      player={player}
      style={{ position: "absolute", width: W, height: H }}
      contentFit="contain"
      nativeControls={false}
    />
  );
}

export default function StoryViewerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const initial = useMemo(() => getStoryFeed(), []);
  const [items, setItems] = useState<StoryFeedItem[]>(initial?.items ?? []);
  const [index, setIndex] = useState(initial?.startIndex ?? 0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(false);
  const mine = Boolean(initial?.mine);
  const authorName = initial?.author?.displayName || "Rfacto";
  const authorAvatar = initial?.author?.avatarUrl;
  const viewed = useRef(new Set<string>());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const close = useCallback(() => {
    clearStoryFeed();
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/messages");
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      if (!initial?.items?.length) close();
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }, [initial, close])
  );

  const current = items[index];
  const currentIsVideo = current
    ? isStatusVideoUrl(current.mediaUrl, current.mediaType)
    : false;

  const goNext = useCallback(() => {
    setIndex((i) => {
      if (i >= items.length - 1) {
        setTimeout(close, 0);
        return i;
      }
      return i + 1;
    });
  }, [items.length, close]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i <= 0 ? 0 : i - 1));
  }, []);

  useEffect(() => {
    if (!current) return;
    if (!viewed.current.has(current.id) && !mine) {
      viewed.current.add(current.id);
      void api(`/api/member-status/${current.id}/view`, { method: "POST" }).catch(
        () => null
      );
    }
  }, [current?.id, mine]);

  // Photo auto-advance (WhatsApp-style segments)
  useEffect(() => {
    if (!current || paused || currentIsVideo) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    setProgress(0);
    const started = Date.now();
    timerRef.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - started) / PHOTO_MS);
      setProgress(p);
      if (p >= 1) {
        if (timerRef.current) clearInterval(timerRef.current);
        goNext();
      }
    }, 32);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [current?.id, paused, currentIsVideo, goNext]);

  // Video: progress unknown → keep bar filling slowly as fallback; end via onEnded
  useEffect(() => {
    if (!current || !currentIsVideo || paused) return;
    setProgress(0);
    const started = Date.now();
    const maxMs = 60_000;
    timerRef.current = setInterval(() => {
      setProgress(Math.min(0.95, (Date.now() - started) / maxMs));
    }, 200);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [current?.id, currentIsVideo, paused]);

  async function deleteCurrent() {
    if (!current || !mine) return;
    Alert.alert(t("story_delete"), t("story_delete_confirm"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("community_delete"),
        style: "destructive",
        onPress: () => {
          void (async () => {
            setBusy(true);
            try {
              await api(
                `/api/member-status?id=${encodeURIComponent(current.id)}`,
                { method: "DELETE" }
              );
              const nextItems = items.filter((it) => it.id !== current.id);
              if (!nextItems.length) {
                close();
                return;
              }
              setItems(nextItems);
              setIndex((i) => Math.min(i, nextItems.length - 1));
            } catch (e) {
              Alert.alert(
                t("messages_title"),
                e instanceof Error ? e.message : t("messages_status_failed")
              );
            } finally {
              setBusy(false);
            }
          })();
        },
      },
    ]);
  }

  if (!current) {
    return <View style={{ flex: 1, backgroundColor: "#0a0a0a" }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      {currentIsVideo ? (
        <StoryVideo
          key={current.id}
          uri={mediaUrl(current.mediaUrl)}
          paused={paused}
          onEnded={() => {
            setProgress(1);
            goNext();
          }}
        />
      ) : (
        <Image
          source={{ uri: mediaUrl(current.mediaUrl) }}
          style={{ position: "absolute", width: W, height: H }}
          resizeMode="contain"
        />
      )}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.12)",
        }}
        pointerEvents="none"
      />

      <View style={{ flex: 1, flexDirection: "row" }}>
        <Pressable
          onPress={goPrev}
          onLongPress={() => setPaused(true)}
          onPressOut={() => setPaused(false)}
          style={{ flex: 1 }}
        />
        <Pressable
          onPress={goNext}
          onLongPress={() => setPaused(true)}
          onPressOut={() => setPaused(false)}
          style={{ flex: 1 }}
        />
      </View>

      <View
        style={{
          position: "absolute",
          top: insets.top + 8,
          left: 10,
          right: 10,
          gap: 10,
        }}
      >
        <View style={{ flexDirection: "row", gap: 3 }}>
          {items.map((it, i) => (
            <View
              key={it.id}
              style={{
                flex: 1,
                height: 2.5,
                borderRadius: 2,
                backgroundColor: "rgba(255,255,255,0.28)",
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: "100%",
                  width:
                    i < index
                      ? "100%"
                      : i === index
                        ? `${Math.round(progress * 100)}%`
                        : "0%",
                  backgroundColor: "#fff",
                  borderRadius: 2,
                }}
              />
            </View>
          ))}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {authorAvatar ? (
            <Image
              source={{ uri: mediaUrl(authorAvatar) }}
              style={{ width: 36, height: 36, borderRadius: 18 }}
            />
          ) : (
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "#5D8443",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "800" }}>
                {authorName.slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>
              {mine ? t("messages_my_status") : authorName}
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12 }}>
              {t("messages_story_views").replace(
                "{n}",
                formatStoryViews(current.viewCount || 0)
              )}
              {` · ${index + 1}/${items.length}`}
            </Text>
          </View>
          {mine ? (
            <Pressable
              onPress={() => void deleteCurrent()}
              disabled={busy}
              hitSlop={10}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(0,0,0,0.35)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#fff" />
            </Pressable>
          ) : null}
          <Pressable
            onPress={close}
            hitSlop={10}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(0,0,0,0.35)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
        </View>
      </View>

      {current.caption ? (
        <View
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: insets.bottom + 28,
            backgroundColor: "rgba(0,0,0,0.45)",
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 12,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 15, lineHeight: 21 }}>
            {current.caption}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
