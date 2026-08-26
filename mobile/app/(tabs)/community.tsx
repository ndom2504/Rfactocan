import * as ImagePicker from "expo-image-picker";
import { type Href, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
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
import { api, mediaUrl, uploadFile } from "@/lib/api";
import {
  attachmentIsImage,
  FILTERS,
  isNativeCommunityPostId,
  postMatchesQuery,
  PUBLISH_KINDS,
  type CommunityAttachment,
  type CommunityFilter,
  type CommunityKind,
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
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [filter, setFilter] = useState<CommunityFilter>("");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<CommunityKind>("BUSINESS");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pending, setPending] = useState<CommunityAttachment[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

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

  const visible = useMemo(
    () => posts.filter((p) => postMatchesQuery(p, query)),
    [posts, query]
  );

  async function addPhotos() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("Autorisez l’accès aux photos pour joindre une image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 10 - pending.length,
    });
    if (result.canceled) return;
    setBusy(true);
    setError("");
    try {
      const extra: CommunityAttachment[] = [];
      for (const [index, asset] of (result.assets ?? []).entries()) {
        const name = asset.fileName || `photo-${index + 1}.jpg`;
        const type =
          asset.mimeType && asset.mimeType !== "application/octet-stream"
            ? asset.mimeType
            : "image/jpeg";
        const att = await uploadFile("/api/community/upload", {
          uri: asset.uri,
          name,
          type,
        });
        extra.push({
          url: att.url,
          name: att.name || name,
          contentType: att.contentType || type,
          size: asset.fileSize ?? 0,
        });
      }
      setPending((prev) => [...prev, ...extra].slice(0, 10));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload échoué");
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    const text = body.trim();
    if (text.length < 10) {
      setError("Le texte doit faire au moins 10 caractères.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await api<{ post: CommunityPost }>("/api/community/posts", {
        method: "POST",
        body: JSON.stringify({
          kind,
          title: title.trim() || undefined,
          body: text,
          attachments: pending,
        }),
      });
      setTitle("");
      setBody("");
      setPending([]);
      setComposerOpen(false);
      if (data.post) setPosts((prev) => [data.post, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publication impossible");
    } finally {
      setBusy(false);
    }
  }

  async function openPost(item: CommunityPost) {
    setBusy(true);
    setError("");
    try {
      let id = item.id;
      if (!isNativeCommunityPostId(id)) {
        const data = await api<{ post: { id: string } }>(
          "/api/community/posts/ensure-source",
          {
            method: "POST",
            body: JSON.stringify({ feedId: id }),
          }
        );
        id = data.post.id;
      }
      router.push(`/community/${id}` as Href);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d’ouvrir la publication.");
    } finally {
      setBusy(false);
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
              placeholder="Nom, texte, type…"
            />
            {!composerOpen ? (
              <Button
                label="Publier"
                onPress={() => setComposerOpen(true)}
                disabled={busy}
              />
            ) : (
              <Card>
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {PUBLISH_KINDS.map((item) => (
                    <Chip
                      key={item.id}
                      label={item.label}
                      selected={kind === item.id}
                      onPress={() => setKind(item.id)}
                    />
                  ))}
                </View>
                <Field
                  label="Titre (optionnel)"
                  value={title}
                  onChangeText={setTitle}
                  maxLength={120}
                />
                <Field
                  label="Texte"
                  value={body}
                  onChangeText={setBody}
                  placeholder="Au moins 10 caractères"
                  multiline
                  numberOfLines={4}
                  style={{ minHeight: 88, textAlignVertical: "top" }}
                />
                {pending.length ? (
                  <Muted>{pending.length} fichier(s) joint(s)</Muted>
                ) : null}
                <Button
                  label="Ajouter des photos"
                  variant="outline"
                  onPress={() => void addPhotos()}
                  disabled={busy || pending.length >= 10}
                />
                <Button label="Envoyer" onPress={() => void publish()} loading={busy} />
                <Button
                  label="Annuler"
                  variant="outline"
                  onPress={() => {
                    if (busy) return;
                    setComposerOpen(false);
                  }}
                />
              </Card>
            )}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
          ) : (
            <Muted>Aucune publication pour le moment.</Muted>
          )
        }
        renderItem={({ item }) => {
          const photo = (item.attachments ?? []).find(attachmentIsImage);
          return (
            <Pressable onPress={() => void openPost(item)}>
              <Card>
                <Text style={{ fontWeight: "700", color: colors.foreground }}>
                  {item.title?.trim() || item.author?.displayName || "Publication"}
                </Text>
                <Muted>
                  {KIND_LABELS[item.kind] || item.kind}
                  {item.author?.displayName ? ` · ${item.author.displayName}` : ""}
                  {` · ${formatDate(item.createdAt)}`}
                  {item.commentCount
                    ? ` · ${item.commentCount} commentaire(s)`
                    : ""}
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
              </Card>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}
