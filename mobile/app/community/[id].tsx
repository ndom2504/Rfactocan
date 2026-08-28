import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";
import { Button, Card, ErrorText, Field, Muted, Screen } from "@/components/ui";
import { CommunityVideoPlayer } from "@/components/community-video-player";
import { api, getApiUrl, mediaUrl } from "@/lib/api";
import {
  attachmentIsImage,
  attachmentIsVideo,
  KIND_LABELS,
  type CommunityPost,
} from "@/lib/community";
import { startDirectChat } from "@/lib/dm";
import { formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { colors } from "@/lib/theme";

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  parentId?: string | null;
  author?: { displayName?: string | null };
};

export default function CommunityPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, locale } = useI18n();
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setError("");
    try {
      const data = await api<{ post: CommunityPost }>(
        `/api/community/posts/${id}`
      );
      setPost(data.post);
      const thread = await api<{ comments: Comment[] }>(
        `/api/community/posts/${id}/comments`
      );
      setComments(thread.comments ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function sendComment() {
    const text = draft.trim();
    if (!text || !id) return;
    setBusy(true);
    setError("");
    try {
      const data = await api<{ comment: Comment }>(
        `/api/community/posts/${id}/comments`,
        {
          method: "POST",
          body: JSON.stringify({ body: text }),
        }
      );
      setDraft("");
      if (data.comment) setComments((prev) => [...prev, data.comment]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Commentaire impossible");
    } finally {
      setBusy(false);
    }
  }

  async function contactAuthor() {
    const authorId = post?.author?.id;
    if (!authorId || !post) return;
    setBusy(true);
    setError("");
    try {
      const body =
        locale === "en"
          ? `Hello, I saw your post « ${post.title?.trim() || "Rfacto"} ».`
          : `Bonjour, j’ai vu votre annonce « ${post.title?.trim() || "Rfacto"} ».`;
      const threadId = await startDirectChat({
        toUserId: authorId,
        body,
      });
      if (threadId) router.push(`/messages/${threadId}`);
      else router.push("/(tabs)/messages");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setBusy(false);
    }
  }

  async function sharePost() {
    if (!id) return;
    try {
      await Share.share({
        message: `${post?.title?.trim() || "Publication Rfacto"}\n${getApiUrl()}/share/community/${id}`,
      });
    } catch {
      /* dismissed */
    }
  }

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
      </Screen>
    );
  }

  if (!post) {
    return (
      <Screen>
        <ErrorText>{error || "Publication introuvable"}</ErrorText>
        <Button label="Retour" variant="outline" onPress={() => router.back()} />
      </Screen>
    );
  }

  const photos = (post.attachments ?? []).filter(attachmentIsImage);
  const videos = (post.attachments ?? []).filter(attachmentIsVideo);
  const files = (post.attachments ?? []).filter(
    (a) => !attachmentIsImage(a) && !attachmentIsVideo(a)
  );

  return (
    <Screen style={{ paddingBottom: 8 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <ErrorText>{error}</ErrorText>
          <Muted>
            {KIND_LABELS[post.kind] || post.kind}
            {post.author?.displayName ? ` · ${post.author.displayName}` : ""}
            {` · ${formatDate(post.createdAt)}`}
          </Muted>
          {post.title?.trim() ? (
            <Text
              style={{
                fontWeight: "700",
                fontSize: 20,
                color: colors.foreground,
                marginTop: 8,
              }}
            >
              {post.title.trim()}
            </Text>
          ) : null}
          <Text
            style={{
              color: colors.foreground,
              marginTop: 8,
              lineHeight: 22,
            }}
          >
            {post.body}
          </Text>
          {photos.map((photo) => (
            <Pressable
              key={photo.url}
              onPress={() => void Linking.openURL(mediaUrl(photo.url))}
              style={{ marginHorizontal: -16, marginTop: 12 }}
            >
              <Image
                source={{ uri: mediaUrl(photo.url) }}
                style={{
                  width: "100%",
                  height: 240,
                  backgroundColor: colors.surface2,
                }}
                resizeMode="cover"
              />
            </Pressable>
          ))}
          {videos.map((video) => (
            <View key={video.url} style={{ marginHorizontal: -16, marginTop: 12 }}>
              <CommunityVideoPlayer
                url={mediaUrl(video.url)}
                edgeToEdge
              />
            </View>
          ))}
          {files.map((file) => (
            <Pressable
              key={file.url}
              onPress={() => void Linking.openURL(mediaUrl(file.url))}
              style={{ marginTop: 8 }}
            >
              <Text
                style={{
                  color: colors.accent,
                  fontWeight: "600",
                  textDecorationLine: "underline",
                }}
              >
                {file.name || "Ouvrir la pièce jointe"}
              </Text>
            </Pressable>
          ))}
          <View style={{ marginTop: 8, gap: 8 }}>
            {!post.isOwner && post.author?.id ? (
              <Button
                label={t("community_contact")}
                onPress={() => void contactAuthor()}
                loading={busy}
              />
            ) : null}
            <Button label="Partager" variant="outline" onPress={() => void sharePost()} />
          </View>
          <Text
            style={{
              fontWeight: "700",
              color: colors.foreground,
              marginTop: 16,
              marginBottom: 8,
            }}
          >
            Commentaires ({comments.length})
          </Text>
          {comments.length === 0 ? (
            <Muted>Soyez le premier à commenter.</Muted>
          ) : (
            comments.map((item) => (
              <Card key={item.id}>
                <Text style={{ fontWeight: "600", color: colors.foreground }}>
                  {item.author?.displayName || "Membre"}
                </Text>
                <Muted>{formatDate(item.createdAt)}</Muted>
                <Text style={{ color: colors.foreground, marginTop: 6 }}>
                  {item.body}
                </Text>
              </Card>
            ))
          )}
          <Field
            label="Votre commentaire"
            value={draft}
            onChangeText={setDraft}
            placeholder="Écrire…"
            multiline
          />
          <Button label="Commenter" onPress={() => void sendComment()} loading={busy} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
