import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Button, ErrorText, Field, Muted, Title } from "@/components/ui";
import { api, mediaUrl, uploadFile } from "@/lib/api";
import {
  PUBLISH_KINDS,
  type CommunityAttachment,
  type CommunityKind,
} from "@/lib/community";
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

export function AnnounceComposer({
  onPublished,
}: {
  onPublished: () => void;
}) {
  const [kind, setKind] = useState<CommunityKind>("COMMUNITY");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<CommunityAttachment[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

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
        <Muted>
          Annonce, événement ou communiqué — publié automatiquement dans le fil
          Communauté.
        </Muted>
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 16 }}>
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
          style={{ minHeight: 120, textAlignVertical: "top" }}
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
        <ErrorText>{error}</ErrorText>
        <Button
          label="Publier l'annonce"
          disabled={busy || uploading || body.trim().length < 10}
          loading={busy}
          onPress={() => void publish()}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
