import { type Href, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type ViewToken,
} from "react-native";
import { Button, ErrorText, Screen } from "@/components/ui";
import { CommunityVideoPlayer } from "@/components/community-video-player";
import { api, getApiUrl, mediaUrl } from "@/lib/api";
import {
  attachmentIsImage,
  attachmentIsVideo,
  FILTERS,
  isNativeCommunityPostId,
  postMatchesQuery,
  type CommunityFilter,
  type CommunityPost,
  KIND_LABELS,
} from "@/lib/community";
import {
  collectCommunityVideos,
  setCommunityVideoFeed,
} from "@/lib/community-video-feed";
import { formatRelativeTime } from "@/lib/format";
import { showIdentityVerified } from "@/lib/kyc";
import { useI18n } from "@/lib/i18n";
import { useOptionalTheme } from "@/lib/theme-context";
import { colors as lightColors } from "@/lib/theme";

function firstPathId(href: string, prefix: string) {
  if (!href.startsWith(prefix)) return "";
  return href.slice(prefix.length).split(/[/?#]/)[0] ?? "";
}

function listingHref(item: CommunityPost): Href | null {
  const href = item.href ?? "";
  const tripId = firstPathId(href, "/trips/");
  if (tripId) return `/trip/${tripId}`;
  const requestId = firstPathId(href, "/requests/");
  if (requestId) return `/request/${requestId}`;
  const productId = firstPathId(href, "/shops/product/");
  if (productId) return `/shops/product/${productId}`;
  const shopId = firstPathId(href, "/shops/");
  if (shopId && shopId !== "product" && shopId !== "category") {
    return `/shops/${shopId}`;
  }
  const communityId = firstPathId(href, "/community/");
  if (communityId) return `/community/${communityId}`;
  const serviceListingId = firstPathId(href, "/services/listing/");
  if (serviceListingId) return `/service/${serviceListingId}` as Href;
  if (href.startsWith("/services")) return "/services";
  const meetUserId = firstPathId(href, "/meet/");
  if (meetUserId) return `/meet/${meetUserId}` as Href;
  if (href.startsWith("/meet")) return "/meet" as Href;
  if (href.includes("/ambassador") || href.startsWith("/herald")) {
    return "/herald" as Href;
  }

  if (item.id.startsWith("trip:")) return `/trip/${item.id.slice(5)}`;
  if (item.id.startsWith("parcel:")) return `/request/${item.id.slice(7)}`;
  if (item.id.startsWith("job:")) return `/request/${item.id.slice(4)}`;
  if (item.id.startsWith("shop:")) return `/shops/${item.id.slice(5)}`;
  if (item.id.startsWith("svc:")) return `/service/${item.id.slice(4)}` as Href;
  if (item.id.startsWith("meet:")) return `/meet/${item.id.slice(5)}` as Href;
  if (isNativeCommunityPostId(item.id)) return `/community/${item.id}`;
  return null;
}

function FeedImage({ url }: { url: string }) {
  const colors = useOptionalTheme()?.colors ?? lightColors;
  const [ratio, setRatio] = useState<number | null>(null);
  return (
    <Image
      source={{ uri: url }}
      onLoad={(e) => {
        const { width, height } = e.nativeEvent.source;
        if (width > 0 && height > 0) setRatio(width / height);
      }}
      style={{
        width: "100%",
        aspectRatio: ratio ?? 4 / 3,
        backgroundColor: colors.surface2,
      }}
      resizeMode="cover"
    />
  );
}

function Avatar({ name, url }: { name: string; url?: string | null }) {
  const colors = useOptionalTheme()?.colors ?? lightColors;
  const src = url ? mediaUrl(url) : "";
  if (src) {
    return (
      <Image
        source={{ uri: src }}
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: colors.accentSoft,
        }}
      />
    );
  }
  return (
    <View
      style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.accentSoft,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 18 }}>
        {(name || "R").slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}

function ActionCell({
  label,
  onPress,
  disabled,
  active,
  busy,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
  busy?: boolean;
}) {
  const colors = useOptionalTheme()?.colors ?? lightColors;
  const locked = Boolean(disabled || busy);
  return (
    <View style={{ flex: 1 }} collapsable={false}>
      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.65}
        disabled={locked}
        onPress={onPress}
        style={{
          minHeight: 40,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 4,
          opacity: locked ? 0.4 : 1,
        }}
      >
        {busy ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <Text
            numberOfLines={1}
            style={{
              fontSize: 12,
              fontWeight: "700",
              textAlign: "center",
              color: active ? colors.accent : colors.muted,
            }}
          >
            {label}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function CommunityScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const colors = useOptionalTheme()?.colors ?? lightColors;
  const params = useLocalSearchParams<{ annoncer?: string }>();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [filter, setFilter] = useState<CommunityFilter>("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [inViewIds, setInViewIds] = useState<Record<string, boolean>>({});
  const [soundPostId, setSoundPostId] = useState<string | null>(null);
  const actionLock = useRef(false);
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 45,
  }).current;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const next: Record<string, boolean> = {};
      let best: { id: string; pct: number } | null = null;
      for (const token of viewableItems) {
        const post = token.item as CommunityPost | undefined;
        if (!post?.id) continue;
        next[post.id] = true;
        const hasVideo = (post.attachments ?? []).some(attachmentIsVideo);
        const pct = token.percentVisible ?? 0;
        if (hasVideo && (!best || pct > best.pct)) {
          best = { id: post.id, pct };
        }
      }
      setInViewIds(next);
      setSoundPostId(best?.id ?? null);
    }
  ).current;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const path = filter
        ? `/api/community/posts?kind=${encodeURIComponent(filter)}&limit=40`
        : "/api/community/posts?limit=40";
      const data = await api<{ posts: CommunityPost[] }>(path);
      setPosts(data.posts ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  useEffect(() => {
    if (params.annoncer === "1") {
      router.replace("/(tabs)/announce");
    }
  }, [params.annoncer, router]);

  const visible = useMemo(
    () => posts.filter((p) => postMatchesQuery(p, query)),
    [posts, query]
  );

  function filterLabel(id: CommunityFilter) {
    switch (id) {
      case "ANNOUNCE":
        return t("community_kind_announce");
      case "TRIP":
        return t("community_kind_trip");
      case "PARCEL":
        return t("community_kind_parcel");
      case "SERVICE":
        return t("community_kind_service");
      default:
        return t("filter_all");
    }
  }

  function kindLabel(kind: string) {
    const keys: Record<string, "community_kind_announce" | "community_kind_trip" | "community_kind_parcel" | "community_kind_service" | "community_kind_business" | "community_kind_opportunity" | "community_kind_community"> = {
      ANNOUNCE: "community_kind_announce",
      TRIP: "community_kind_trip",
      PARCEL: "community_kind_parcel",
      SERVICE: "community_kind_service",
      BUSINESS: "community_kind_business",
      OPPORTUNITY: "community_kind_opportunity",
      COMMUNITY: "community_kind_community",
    };
    const key = keys[kind];
    return key ? t(key) : KIND_LABELS[kind] || kind;
  }

  function runExclusive(key: string, run: () => void | Promise<void>) {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusyKey(key);
    setError("");
    void Promise.resolve()
      .then(run)
      .catch((e) => {
        setError(e instanceof Error ? e.message : t("retry"));
      })
      .finally(() => {
        setBusyKey(null);
        setTimeout(() => {
          actionLock.current = false;
        }, 400);
      });
  }

  function openListing(item: CommunityPost) {
    const dest = listingHref(item);
    if (dest) router.push(dest);
  }

  function openComments(item: CommunityPost) {
    runExclusive(`${item.id}:comments`, async () => {
      if (isNativeCommunityPostId(item.id) && (item.source === "post" || !item.source)) {
        router.push(`/community/${item.id}`);
        return;
      }
      const data = await api<{ post?: { id: string }; error?: string }>(
        "/api/community/posts/ensure-source",
        {
          method: "POST",
          body: JSON.stringify({ feedId: item.id }),
        }
      );
      if (!data.post?.id) {
        throw new Error(data.error || "Impossible d'ouvrir les commentaires");
      }
      router.push(`/community/${data.post.id}`);
    });
  }

  function toggleConnect(item: CommunityPost) {
    const authorId = item.author?.id;
    if (!authorId || item.isOwner) return;
    runExclusive(`${item.id}:connect`, async () => {
      const connected = Boolean(item.author?.connectedByMe);
      const data = await api<{ connected?: boolean; connectionCount?: number }>(
        connected
          ? `/api/connections?userId=${encodeURIComponent(authorId)}`
          : "/api/connections",
        connected
          ? { method: "DELETE" }
          : {
              method: "POST",
              body: JSON.stringify({ userId: authorId }),
            }
      );
      setPosts((prev) =>
        prev.map((p) =>
          p.author?.id === authorId
            ? {
                ...p,
                author: {
                  ...p.author!,
                  connectedByMe: Boolean(data.connected),
                  connectionCount:
                    typeof data.connectionCount === "number"
                      ? data.connectionCount
                      : p.author?.connectionCount ?? 0,
                },
              }
            : p
        )
      );
    });
  }

  async function sharePost(item: CommunityPost) {
    const url = `${getApiUrl()}/share/community/${encodeURIComponent(item.id)}`;
    try {
      await Share.share({
        message: `${item.title || item.author?.displayName || "Rfacto"}\n${url}`,
        url,
      });
    } catch {
      /* cancelled */
    }
  }

  async function setPostAsStatus(item: CommunityPost) {
    const media = (item.attachments ?? []).find(
      (a) => attachmentIsImage(a) || attachmentIsVideo(a)
    );
    if (!media) {
      Alert.alert(t("messages_title"), t("community_status_no_media"));
      return;
    }
    const isVideo = attachmentIsVideo(media);
    try {
      const payload = {
        kind: "STORY",
        mediaUrl: media.url,
        mediaType: isVideo ? "video" : "image",
        caption: item.title?.trim() || undefined,
        mirrorCommunity: false,
      };
      try {
        await api("/api/member-status", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } catch (first) {
        const msg = first instanceof Error ? first.message : "";
        if (msg.includes("404") || msg.includes("Erreur 404")) {
          await api("/api/status", {
            method: "POST",
            body: JSON.stringify(payload),
          });
        } else {
          throw first;
        }
      }
      Alert.alert(t("messages_title"), t("messages_status_published"));
    } catch (e) {
      Alert.alert(
        t("messages_title"),
        e instanceof Error ? e.message : t("messages_status_failed")
      );
    }
  }

  function openPostOptions(item: CommunityPost) {
    const hasMedia = (item.attachments ?? []).some(
      (a) => attachmentIsImage(a) || attachmentIsVideo(a)
    );
    const buttons: {
      text: string;
      style?: "cancel" | "destructive" | "default";
      onPress?: () => void;
    }[] = [
      {
        text: t("community_share"),
        onPress: () => void sharePost(item),
      },
    ];
    if (hasMedia) {
      buttons.push({
        text: t("community_set_as_status"),
        onPress: () => void setPostAsStatus(item),
      });
    }
    buttons.push({ text: t("cancel"), style: "cancel" });
    Alert.alert(
      item.title?.trim() || item.author?.displayName || "Rfacto",
      undefined,
      buttons
    );
  }

  const header: ReactNode = (
    <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>
      <Text
        style={{
          fontSize: 28,
          fontWeight: "800",
          textAlign: "center",
          color: colors.foreground,
          letterSpacing: -0.4,
        }}
      >
        {t("nav_community")}
      </Text>
      <Text
        style={{
          marginTop: 8,
          fontSize: 15,
          lineHeight: 22,
          textAlign: "center",
          color: colors.muted,
          paddingHorizontal: 8,
        }}
      >
        {t("community_announce_prompt")}
      </Text>
      <View style={{ marginTop: 16, alignSelf: "stretch" }}>
        <Button
          label={t("nav_announce")}
          variant="outline"
          onPress={() => router.push("/(tabs)/announce")}
        />
      </View>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 8,
          marginTop: 18,
        }}
      >
        {FILTERS.map((item) => {
          const selected = filter === item.id;
          return (
            <Pressable
              key={item.id || "all"}
              onPress={() => setFilter(item.id)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: selected ? colors.accent : colors.surface,
                borderWidth: 1,
                borderColor: selected ? colors.accent : colors.border,
              }}
            >
              <Text
                style={{
                  fontWeight: "700",
                  fontSize: 13,
                  color: selected ? colors.white : colors.foreground,
                }}
              >
                {filterLabel(item.id)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={t("community_search_placeholder")}
        placeholderTextColor={colors.muted}
        style={{
          marginTop: 14,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 16,
          color: colors.foreground,
        }}
      />
    </View>
  );

  return (
    <Screen style={{ padding: 0 }}>
      {error ? (
        <View style={{ paddingHorizontal: 16 }}>
          <ErrorText>{error}</ErrorText>
        </View>
      ) : null}
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={() => void load()}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: 40 }}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} />
          ) : (
            <Text
              style={{
                marginTop: 28,
                paddingHorizontal: 28,
                textAlign: "center",
                color: colors.muted,
                fontSize: 15,
                lineHeight: 22,
              }}
            >
              {t("community_empty")}
            </Text>
          )
        }
        renderItem={({ item }) => {
          const photos = (item.attachments ?? []).filter(attachmentIsImage);
          const videos = (item.attachments ?? []).filter(attachmentIsVideo);
          const longBody =
            item.body.length > 280 || (item.body.match(/\n/g) || []).length >= 5;
          const isOpen = Boolean(expanded[item.id]);
          const name = item.author?.displayName || "Rfacto";
          const authorId = item.author?.id;
          const openMember = () => {
            if (authorId) router.push(`/member/${authorId}` as Href);
          };
          return (
            <View
              style={{
                backgroundColor: colors.surface,
                marginHorizontal: 16,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.border,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingHorizontal: 14,
                  paddingTop: 12,
                  paddingBottom: 8,
                }}
              >
                <Pressable onPress={openMember} disabled={!authorId}>
                  <Avatar name={name} url={item.author?.avatarUrl} />
                </Pressable>
                <Pressable
                  onPress={openMember}
                  disabled={!authorId}
                  style={{ flex: 1 }}
                >
                  <Text
                    style={{
                      fontWeight: "700",
                      color: colors.foreground,
                      fontSize: 15,
                    }}
                    numberOfLines={1}
                  >
                    {name}
                    {showIdentityVerified(item.author?.verified)
                      ? ` · ${t("verified")}`
                      : ""}
                  </Text>
                  <Text
                    style={{
                      marginTop: 2,
                      color: colors.muted,
                      fontSize: 12,
                    }}
                    numberOfLines={1}
                  >
                    {kindLabel(item.kind)}
                    {formatRelativeTime(item.createdAt)
                      ? ` · ${formatRelativeTime(item.createdAt)}`
                      : ""}
                    {` · ${item.author?.connectionCount ?? 0} ${t("community_connections")}`}
                  </Text>
                </Pressable>
              </View>

              {item.title?.trim() ? (
                <Pressable
                  onPress={() => openListing(item)}
                  style={{ paddingHorizontal: 14 }}
                >
                  <Text
                    style={{
                      fontWeight: "700",
                      fontSize: 16,
                      color: colors.foreground,
                      marginBottom: 4,
                    }}
                  >
                    {item.title.trim()}
                  </Text>
                </Pressable>
              ) : null}

              {item.body ? (
                <Text
                  style={{
                    color: colors.foreground,
                    lineHeight: 21,
                    paddingHorizontal: 14,
                    paddingBottom: 8,
                  }}
                  numberOfLines={longBody && !isOpen ? 5 : undefined}
                >
                  {item.body}
                </Text>
              ) : null}
              {longBody ? (
                <Pressable
                  onPress={() =>
                    setExpanded((prev) => ({
                      ...prev,
                      [item.id]: !prev[item.id],
                    }))
                  }
                  style={{ paddingHorizontal: 14, paddingBottom: 8 }}
                >
                  <Text
                    style={{
                      color: colors.accent,
                      fontWeight: "700",
                      fontSize: 13,
                    }}
                  >
                    {isOpen ? t("community_read_less") : t("community_read_more")}
                  </Text>
                </Pressable>
              ) : null}

              {photos.map((photo) => (
                <FeedImage key={photo.url} url={mediaUrl(photo.url)} />
              ))}
              {videos.map((video) => (
                <CommunityVideoPlayer
                  key={video.url}
                  url={mediaUrl(video.url)}
                  edgeToEdge
                  inView={Boolean(inViewIds[item.id])}
                  canHear={soundPostId === item.id}
                  onOpenFeed={(url) => {
                    setCommunityVideoFeed(collectCommunityVideos(posts), url);
                    router.push("/community/videos");
                  }}
                />
              ))}

              {(item.commentCount ?? 0) > 0 ? (
                <Text
                  style={{
                    color: colors.muted,
                    fontSize: 12,
                    paddingHorizontal: 14,
                    paddingTop: 8,
                  }}
                >
                  {item.commentCount} {t("community_comment_action")}
                </Text>
              ) : null}

              <View
                style={{
                  marginTop: 4,
                  flexDirection: "row",
                  paddingHorizontal: 4,
                  paddingVertical: 4,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                }}
              >
                <ActionCell
                  label={
                    item.author?.connectedByMe
                      ? t("community_connected")
                      : t("community_connect")
                  }
                  active={Boolean(item.author?.connectedByMe)}
                  disabled={item.isOwner}
                  busy={busyKey === `${item.id}:connect`}
                  onPress={() => toggleConnect(item)}
                />
                <ActionCell
                  label={t("community_comment_action")}
                  busy={busyKey === `${item.id}:comments`}
                  onPress={() => openComments(item)}
                />
                <ActionCell
                  label={t("community_see")}
                  onPress={() =>
                    runExclusive(`${item.id}:see`, () => openListing(item))
                  }
                />
                <ActionCell
                  label={t("community_share")}
                  onPress={() =>
                    runExclusive(`${item.id}:share`, async () => {
                      openPostOptions(item);
                    })
                  }
                />
              </View>
            </View>
          );
        }}
      />
    </Screen>
  );
}
