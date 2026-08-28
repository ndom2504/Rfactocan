import { type Href, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";
import { Button, ErrorText, Field, Muted, Screen } from "@/components/ui";
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
import { formatDate } from "@/lib/format";
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
  const shopId = firstPathId(href, "/shops/");
  if (shopId && shopId !== "product" && shopId !== "category") {
    return `/shops/${shopId}`;
  }
  const communityId = firstPathId(href, "/community/");
  if (communityId) return `/community/${communityId}`;
  const serviceListingId = firstPathId(href, "/services/listing/");
  if (serviceListingId) return `/service/${serviceListingId}`;
  if (href.startsWith("/services")) return "/services";
  if (href.startsWith("/meet")) return "/meet";

  if (item.id.startsWith("trip:")) return `/trip/${item.id.slice(5)}`;
  if (item.id.startsWith("parcel:")) return `/request/${item.id.slice(7)}`;
  if (item.id.startsWith("job:")) return `/request/${item.id.slice(4)}`;
  if (item.id.startsWith("shop:")) return `/shops/${item.id.slice(5)}`;
  if (item.id.startsWith("svc:")) return `/service/${item.id.slice(4)}`;
  if (item.id.startsWith("meet:")) return "/meet";
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
      <Text style={{ color: colors.accent, fontWeight: "700", fontSize: 18 }}>
        {(name || "R").slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}

function Action({
  label,
  onPress,
  disabled,
  active,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  const colors = useOptionalTheme()?.colors ?? lightColors;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={{
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: active ? colors.accentSoft : "transparent",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          color: active ? colors.accent : colors.muted,
        }}
      >
        {label}
      </Text>
    </Pressable>
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
  const [busyId, setBusyId] = useState<string | null>(null);

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

  function openListing(item: CommunityPost) {
    const dest = listingHref(item);
    if (dest) router.push(dest);
  }

  async function openComments(item: CommunityPost) {
    setBusyId(item.id);
    setError("");
    try {
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
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setBusyId(null);
    }
  }

  async function toggleConnect(item: CommunityPost) {
    const authorId = item.author?.id;
    if (!authorId || item.isOwner) return;
    setBusyId(item.id);
    setError("");
    try {
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
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setBusyId(null);
    }
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

  const header: ReactNode = (
    <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
      <Muted>{t("community_announce_prompt")}</Muted>
      <View style={{ marginBottom: 20 }}>
        <Button
          label={t("nav_announce")}
          onPress={() => router.push("/(tabs)/announce")}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 8, gap: 8 }}
      >
        {FILTERS.map((item) => {
          const selected = filter === item.id;
          return (
            <Pressable
              key={item.id || "all"}
              onPress={() => setFilter(item.id)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: selected ? colors.accent : colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text
                style={{
                  fontWeight: "700",
                  fontSize: 13,
                  color: selected ? "#fff" : colors.foreground,
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Field
        label={t("search")}
        value={query}
        onChangeText={setQuery}
        placeholder="Trajet, kilos, auteur…"
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
        contentContainerStyle={{ paddingBottom: 24 }}
        ItemSeparatorComponent={() => (
          <View style={{ height: 8, backgroundColor: colors.surface2 }} />
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
          ) : (
            <View style={{ paddingHorizontal: 16 }}>
              <Muted>
                Rien pour le moment. Annoncez un événement, ou publiez un voyage,
                un colis ou un service.
              </Muted>
            </View>
          )
        }
        renderItem={({ item }) => {
          const photos = (item.attachments ?? []).filter(attachmentIsImage);
          const videos = (item.attachments ?? []).filter(attachmentIsVideo);
          const longBody =
            item.body.length > 280 || (item.body.match(/\n/g) || []).length >= 5;
          const isOpen = Boolean(expanded[item.id]);
          const name = item.author?.displayName || "Rfacto";
          return (
            <View style={{ backgroundColor: colors.background, width: "100%" }}>
              <View
                style={{
                  flexDirection: "row",
                  gap: 12,
                  paddingHorizontal: 16,
                  paddingTop: 12,
                  paddingBottom: 8,
                }}
              >
                <View style={{ alignItems: "center", width: 56 }}>
                  <Avatar name={name} url={item.author?.avatarUrl} />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: colors.foreground,
                      marginTop: 4,
                    }}
                  >
                    {item.author?.connectionCount ?? 0}
                  </Text>
                  <Text
                    style={{
                      fontSize: 10,
                      color: colors.muted,
                      textAlign: "center",
                    }}
                  >
                    {t("community_connections")}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontWeight: "700",
                      color: colors.foreground,
                      fontSize: 15,
                    }}
                  >
                    {name}
                  </Text>
                  {item.author?.verified ? (
                    <Text
                      style={{
                        color: colors.accent,
                        fontSize: 12,
                        fontWeight: "600",
                      }}
                    >
                      {t("verified")}
                    </Text>
                  ) : null}
                  <Muted>
                    {KIND_LABELS[item.kind] || item.kind}
                    {` · ${formatDate(item.createdAt)}`}
                  </Muted>
                </View>
              </View>

              {item.title?.trim() ? (
                <Pressable
                  onPress={() => openListing(item)}
                  style={{ paddingHorizontal: 16 }}
                >
                  <Text
                    style={{
                      fontWeight: "700",
                      fontSize: 16,
                      color: colors.accent,
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
                    lineHeight: 20,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
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
                  style={{ paddingHorizontal: 16 }}
                >
                  <Text
                    style={{
                      color: colors.accent,
                      fontWeight: "700",
                      marginTop: 4,
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
                />
              ))}

              <Text
                style={{
                  color: colors.muted,
                  fontSize: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 4,
                }}
              >
                {item.commentCount ?? 0} {t("community_comment_action")}
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  marginTop: 2,
                  paddingHorizontal: 8,
                  paddingBottom: 8,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                }}
              >
                <Action
                  label={
                    item.author?.connectedByMe
                      ? t("community_connected")
                      : t("community_connect")
                  }
                  active={Boolean(item.author?.connectedByMe)}
                  disabled={item.isOwner || busyId === item.id}
                  onPress={() => void toggleConnect(item)}
                />
                <Action
                  label={`${t("community_comment_action")} (${item.commentCount ?? 0})`}
                  disabled={busyId === item.id}
                  onPress={() => void openComments(item)}
                />
                <Action
                  label={t("community_see")}
                  onPress={() => openListing(item)}
                />
                <Action
                  label={t("community_share")}
                  onPress={() => void sharePost(item)}
                />
              </View>
            </View>
          );
        }}
      />
    </Screen>
  );
}
