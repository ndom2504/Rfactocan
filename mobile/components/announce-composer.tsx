import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Chip, ChipRow } from "@/components/chip";
import { PublishServiceIntents } from "@/components/publish-service-intents";
import { Button, ErrorText, Field, Muted, Title } from "@/components/ui";
import { TripForm } from "@/components/trip-form";
import { api, mediaUrl, uploadFile } from "@/lib/api";
import { prepareImageUpload } from "@/lib/prepare-image";
import { type CommunityAttachment, type CommunityKind } from "@/lib/community";
import { useI18n } from "@/lib/i18n";
import { colors } from "@/lib/theme";

type AnnounceMode = "event" | "trip" | "service";

export function AnnounceComposer({
  onPublished,
}: {
  onPublished: () => void;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [mode, setMode] = useState<AnnounceMode>("event");
  const [kind] = useState<CommunityKind>("OPPORTUNITY");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<CommunityAttachment[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tripLoading, setTripLoading] = useState(false);

  async function pickAttachments() {
    const remaining = 10 - attachments.length;
    if (remaining <= 0) {
      setError("Maximum 10 fichiers par publication.");
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("Autorisez l’accès aux photos pour joindre une image ou une vidéo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
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
        const name = asset.fileName || `media-${index + 1}.jpg`;
        const isVideo =
          /\.(mp4|mov|webm|m4v)$/i.test(name) ||
          (asset.mimeType || "").startsWith("video/");
        const file = isVideo
          ? {
              uri: asset.uri,
              name,
              type: asset.mimeType || "video/mp4",
            }
          : await prepareImageUpload(asset);
        const uploaded = await uploadFile("/api/community/upload", file);
        next.push({
          url: uploaded.url,
          name: uploaded.name || name,
          contentType: uploaded.contentType || file.type,
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
      onPublished();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publication impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        <Title>Annoncer</Title>
        <Muted>{t("community_announce_prompt")}</Muted>
        <View style={{ marginTop: 16 }}>
          <ChipRow>
            <Chip
              label={t("announce_mode_event")}
              selected={mode === "event"}
              onPress={() => setMode("event")}
            />
            <Chip
              label={t("announce_mode_trip")}
              selected={mode === "trip"}
              onPress={() => setMode("trip")}
            />
            <Chip
              label={t("announce_mode_service")}
              selected={mode === "service"}
              onPress={() => setMode("service")}
            />
          </ChipRow>
        </View>
        {mode === "trip" ? (
          <>
            <ErrorText>{error}</ErrorText>
            <TripForm
              mode="create"
              submitting={tripLoading}
              onSubmit={async (payload) => {
                setTripLoading(true);
                setError("");
                try {
                  await api("/api/trips", {
                    method: "POST",
                    body: JSON.stringify(payload),
                  });
                  onPublished();
                } catch (e) {
                  setError(e instanceof Error ? e.message : t("retry"));
                } finally {
                  setTripLoading(false);
                }
              }}
            />
          </>
        ) : mode === "service" ? (
          <>
            <PublishServiceIntents />
            <Button
              label={t("dashboard_publish_service")}
              variant="outline"
              onPress={() => router.push("/service/new")}
            />
          </>
        ) : (
          <>
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
              style={{ minHeight: 120, textAlignVertical: "top" }}
            />
            <Button
              label={uploading ? "Envoi…" : "Joindre une photo ou une vidéo"}
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
            <ErrorText>{error}</ErrorText>
            <Button
              label="Publier l'annonce"
              disabled={busy || uploading || body.trim().length < 10}
              loading={busy}
              onPress={() => void publish()}
            />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
