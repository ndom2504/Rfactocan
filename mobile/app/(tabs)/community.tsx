import { type Href, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Button, Card, ErrorText, Field, Muted, Screen } from "@/components/ui";
import { api, mediaUrl } from "@/lib/api";
import {
  attachmentIsImage,
  FILTERS,
  isNativeCommunityPostId,
  postMatchesQuery,
  type CommunityFilter,
  type CommunityPost,
  KIND_LABELS,
} from "@/lib/community";
import { formatDate } from "@/lib/format";
import { colors } from "@/lib/theme";

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: selected ? colors.accent : colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      <Text
        style={{
          fontWeight: "700",
          fontSize: 13,
          color: selected ? "#fff" : colors.foreground,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function CommunityScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ annoncer?: string }>();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [filter, setFilter] = useState<CommunityFilter>("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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
    if (item.href) {
      if (item.href.startsWith("/trips/")) {
        router.push(`/trip/${item.href.replace("/trips/", "")}` as Href);
        return;
      }
      if (item.href.startsWith("/requests/")) {
        router.push(`/request/${item.href.replace("/requests/", "")}` as Href);
        return;
      }
      if (item.href.startsWith("/services/listing/")) {
        router.push("/services" as Href);
        return;
      }
      if (item.href.startsWith("/community/")) {
        router.push(item.href as Href);
        return;
      }
    }
    if (item.id.startsWith("trip:")) {
      router.push(`/trip/${item.id.slice(5)}` as Href);
      return;
    }
    if (item.id.startsWith("parcel:")) {
      router.push(`/request/${item.id.slice(7)}` as Href);
      return;
    }
    if (isNativeCommunityPostId(item.id)) {
      router.push(`/community/${item.id}` as Href);
    }
  }

  return (
    <Screen style={{ paddingBottom: 0 }}>
      <ErrorText>{error}</ErrorText>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={load}
        ListHeaderComponent={
          <View>
            <Muted>
              Voyages, colis, services — et les annonces, événements et
              communiqués de la communauté.
            </Muted>
            <Button
              label="Annoncer"
              onPress={() => router.push("/(tabs)/announce")}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", flexWrap: "nowrap", paddingBottom: 4 }}>
                {FILTERS.map((item) => (
                  <Chip
                    key={item.id || "all"}
                    label={item.label}
                    selected={filter === item.id}
                    onPress={() => setFilter(item.id)}
                  />
                ))}
              </View>
            </ScrollView>
            <Field
              label="Rechercher"
              value={query}
              onChangeText={setQuery}
              placeholder="Trajet, kilos, auteur…"
            />
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
          ) : (
            <Muted>
              Rien pour le moment. Annoncez un événement, ou publiez un voyage,
              un colis ou un service.
            </Muted>
          )
        }
        renderItem={({ item }) => {
          const photo = (item.attachments ?? []).find(attachmentIsImage);
          return (
            <Pressable onPress={() => openListing(item)}>
              <Card>
                <Text style={{ fontWeight: "700", color: colors.foreground }}>
                  {item.title?.trim() || item.author?.displayName || "Annonce"}
                </Text>
                <Muted>
                  {KIND_LABELS[item.kind] || item.kind}
                  {item.author?.displayName ? ` · ${item.author.displayName}` : ""}
                  {` · ${formatDate(item.createdAt)}`}
                </Muted>
                <Text
                  style={{ color: colors.foreground, marginTop: 8 }}
                  numberOfLines={5}
                >
                  {item.body}
                </Text>
                {photo ? (
                  <Image
                    source={{ uri: mediaUrl(photo.url) }}
                    style={{
                      marginTop: 10,
                      width: "100%",
                      height: 180,
                      borderRadius: 12,
                      backgroundColor: colors.surface2,
                    }}
                    resizeMode="cover"
                  />
                ) : null}
                <Text
                  style={{
                    marginTop: 10,
                    color: colors.accent,
                    fontWeight: "700",
                  }}
                >
                  Consulter
                </Text>
              </Card>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}
