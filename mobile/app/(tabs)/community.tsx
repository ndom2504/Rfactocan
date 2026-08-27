import * as ImagePicker from "expo-image-picker";
import { type Href, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
  const params = useLocalSearchParams<{ annoncer?: string }>();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [filter, setFilter] = useState<CommunityFilter>("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [kind, setKind] = useState<CommunityKind>("COMMUNITY");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<CommunityAttachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

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
    if (params.annoncer === "1") setComposerOpen(true);
  }, [params.annoncer]);

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

  async function pickAttachments() {
    const remaining = 10 - attachments.length;
    if (remaining <= 0) {
      setError("Maximum 10 fichiers par publication.");
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("Autorisez l’accès aux photos pour joindre une image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
    });
    if (result.canceled) return;
    setUploading(true);
    setError("");
    try {
      const next = [...attachments];
      for (const [index, asset] of (result.assets ?? []).entries()) {
        const name = asset.fileName || `photo-${index + 1}.jpg`;
        const type = asset.mimeType || "image/jpeg";
        const uploaded = await uploadFile("/api/community/upload", {
          uri: asset.uri,
          name,
          type,
        });
        next.push({
          url: uploaded.url,
          name: uploaded.name || name,
          contentType: uploaded.contentType || type,
          size: 0,
        });
      }
      setAttachments(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload échoué");
    } finally {
      setUploading(false);
    }
  }

  async function publish() {
    const text = body.trim();
    if (text.length < 10) {
      setError("Décrivez l’annonce (au moins 10 caractères).");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("/api/community/posts", {
        method: "POST",
        body: JSON.stringify({
          kind,
          title: title.trim() || undefined,
          body: text,
          attachments: attachments.length ? attachments : undefined,
        }),
      });
      setTitle("");
      setBody("");
      setAttachments([]);
      setKind("COMMUNITY");
      setComposerOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publication impossible");
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
            <Muted>
              Voyages, colis, services — et les annonces, événements et
              communiqués de la communauté.
            </Muted>
            <Button
              label="Annoncer"
              onPress={() => {
                setError("");
                setComposerOpen(true);
              }}
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

      <Modal
        visible={composerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (!busy && !uploading) setComposerOpen(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "rgba(0,0,0,0.4)",
          }}
        >
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              padding: 16,
              maxHeight: "90%",
            }}
          >
            <Text
              style={{
                fontWeight: "700",
                fontSize: 18,
                color: colors.foreground,
                marginBottom: 6,
              }}
            >
              Nouvelle annonce
            </Text>
            <Muted>
              Annonce, événement ou communiqué — publié automatiquement dans le
              fil.
            </Muted>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 12 }}>
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
                onChangeText={(v) => setTitle(v.slice(0, 120))}
                placeholder="Titre"
              />
              <Field
                label="Texte"
                value={body}
                onChangeText={(v) => setBody(v.slice(0, 4000))}
                placeholder="Décrivez l’annonce (au moins 10 caractères)…"
                multiline
                style={{ minHeight: 96, textAlignVertical: "top" }}
              />
              <Button
                label={uploading ? "Envoi…" : "Joindre une image"}
                variant="outline"
                disabled={uploading || busy || attachments.length >= 10}
                onPress={() => void pickAttachments()}
              />
              {attachments.length > 0 ? (
                <ScrollView horizontal style={{ marginBottom: 12 }}>
                  {attachments.map((att, index) => (
                    <Pressable
                      key={`${att.url}-${index}`}
                      onPress={() =>
                        setAttachments((prev) => prev.filter((_, i) => i !== index))
                      }
                    >
                      <Image
                        source={{ uri: mediaUrl(att.url) }}
                        style={{
                          width: 72,
                          height: 72,
                          borderRadius: 8,
                          marginRight: 8,
                          backgroundColor: colors.surface2,
                        }}
                      />
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}
              <Button
                label="Publier l'annonce"
                disabled={busy || uploading || body.trim().length < 10}
                loading={busy}
                onPress={() => void publish()}
              />
              <Button
                label="Annuler"
                variant="outline"
                disabled={busy || uploading}
                onPress={() => setComposerOpen(false)}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}
