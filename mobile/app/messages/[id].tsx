import { requestRecordingPermissionsAsync } from "expo-audio";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { useCallActions } from "@/components/call-provider";
import { VoiceNoteBubble } from "@/components/voice-note-bubble";
import { VoiceNoteButton } from "@/components/voice-note-button";
import { Button, ErrorText, Field, Muted, Screen } from "@/components/ui";
import { api, isImageAttachment, mediaUrl, uploadFile } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { createOutgoingCall } from "@/lib/calls";
import { colors } from "@/lib/theme";
import { isVoiceMessage, stopAllVoicePlayback } from "@/lib/voice";

type Message = {
  id: string;
  body?: string | null;
  attachmentUrl?: string | null;
  senderId: string;
  createdAt: string;
};

type PickedFile = { uri: string; name: string; type: string };

function guessMime(name: string, mime?: string | null) {
  if (mime && mime !== "application/octet-stream") return mime;
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "pdf") return "application/pdf";
  if (ext === "mp4") return "video/mp4";
  if (ext === "mov") return "video/quicktime";
  return mime || "application/octet-stream";
}

function fileNameFromUri(uri: string, fallback: string) {
  const last = uri.split("/").pop()?.split("?")[0];
  return last && last.includes(".") ? last : fallback;
}

function isAttachmentOnlyBody(body?: string | null) {
  const text = (body || "").trim();
  return (
    !text ||
    text === "Pièce jointe" ||
    text === "Attachment" ||
    text === "📎" ||
    text === "Note vocale" ||
    text === "Voice note"
  );
}

export default function DirectChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { startOutgoing } = useCallActions();
  const listRef = useRef<FlatList<Message>>(null);
  const [peer, setPeer] = useState<string>("");
  const [peerAvatar, setPeerAvatar] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [calling, setCalling] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setError("");
    try {
      const data = await api<{
        messages: Message[];
        peer?: { displayName?: string | null; avatarUrl?: string | null };
      }>(`/api/dm/${id}/messages`);
      setMessages(data.messages ?? []);
      setPeer(data.peer?.displayName || "Contact");
      setPeerAvatar(data.peer?.avatarUrl ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function startCall() {
    if (!id || calling) return;
    stopAllVoicePlayback();
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      setError("Autorisez le micro pour appeler.");
      return;
    }
    setCalling(true);
    setError("");
    try {
      const call = await createOutgoingCall(id, "AUDIO");
      startOutgoing({
        ...call,
        direction: "outbound",
        peer: call.peer || { displayName: peer, avatarUrl: peerAvatar },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d’appeler.");
    } finally {
      setCalling(false);
    }
  }

  async function send() {
    const body = draft.trim();
    if (!body || !id) return;
    setSending(true);
    setError("");
    try {
      await api(`/api/dm/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      setDraft("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Envoi impossible");
    } finally {
      setSending(false);
    }
  }

  async function sendVoice(file: PickedFile) {
    if (!id) return;
    stopAllVoicePlayback();
    setSending(true);
    setError("");
    try {
      const att = await uploadFile("/api/community/upload", file);
      await api(`/api/dm/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({
          body: "Note vocale",
          attachmentUrl: att.url,
        }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d’envoyer la note vocale.");
      throw e;
    } finally {
      setSending(false);
    }
  }

  async function sendFiles(files: PickedFile[]) {
    if (!id || !files.length) return;
    stopAllVoicePlayback();
    const caption = draft.trim();
    setSending(true);
    setError("");
    try {
      for (const [index, file] of files.entries()) {
        const att = await uploadFile("/api/community/upload", file);
        await api(`/api/dm/${id}/messages`, {
          method: "POST",
          body: JSON.stringify({
            attachmentUrl: att.url,
            ...(index === 0 && caption ? { body: caption } : {}),
          }),
        });
      }
      setDraft("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Envoi de la pièce jointe impossible.");
    } finally {
      setSending(false);
    }
  }

  async function pickPhotos() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("Autorisez l’accès aux photos pour envoyer une image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 10,
    });
    if (result.canceled) return;
    const files = (result.assets ?? []).map((asset, index) => {
      const name = asset.fileName || fileNameFromUri(asset.uri, `photo-${index + 1}.jpg`);
      return {
        uri: asset.uri,
        name,
        type: guessMime(name, asset.mimeType),
      };
    });
    await sendFiles(files);
  }

  async function pickDocuments() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"],
      copyToCacheDirectory: true,
      multiple: true,
    });
    if (result.canceled) return;
    const files = (result.assets ?? []).slice(0, 10).map((asset) => ({
      uri: asset.uri,
      name: asset.name || fileNameFromUri(asset.uri, "fichier.pdf"),
      type: guessMime(asset.name || "fichier.pdf", asset.mimeType),
    }));
    await sendFiles(files);
  }

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
      </Screen>
    );
  }

  return (
    <Screen style={{ paddingBottom: 8 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 4,
        }}
      >
        <Muted>{peer}</Muted>
        <Button
          label="Appeler"
          variant="outline"
          onPress={() => void startCall()}
          loading={calling}
          disabled={sending}
        />
      </View>
      <ErrorText>{error}</ErrorText>
      {sending ? <Muted>Envoi en cours…</Muted> : null}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 12, gap: 8 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            const mine = item.senderId === user?.id;
            const url = item.attachmentUrl ? mediaUrl(item.attachmentUrl) : "";
            const voice = isVoiceMessage(item.attachmentUrl, item.body);
            const showBody = !isAttachmentOnlyBody(item.body) && !voice;
            return (
              <View
                style={{
                  alignSelf: mine ? "flex-end" : "flex-start",
                  maxWidth: "82%",
                  backgroundColor: mine ? colors.accent : colors.surface,
                  borderWidth: mine ? 0 : 1,
                  borderColor: colors.border,
                  borderRadius: 14,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                {voice && url ? (
                  <VoiceNoteBubble url={url} mine={mine} />
                ) : url ? (
                  <Pressable
                    onPress={() => void Linking.openURL(url)}
                    style={{ marginBottom: showBody ? 8 : 0 }}
                  >
                    {isImageAttachment(item.attachmentUrl) ? (
                      <Image
                        source={{ uri: url }}
                        style={{ width: 220, height: 160, borderRadius: 10 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text
                        style={{
                          color: mine ? "#fff" : colors.accent,
                          textDecorationLine: "underline",
                          fontWeight: "600",
                        }}
                      >
                        Ouvrir la pièce jointe
                      </Text>
                    )}
                  </Pressable>
                ) : null}
                {showBody ? (
                  <Text style={{ color: mine ? "#fff" : colors.foreground }}>
                    {item.body}
                  </Text>
                ) : null}
              </View>
            );
          }}
        />
        <VoiceNoteButton
          sending={sending}
          disabled={sending}
          onRecorded={sendVoice}
        />
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 4 }}>
          <View style={{ flex: 1 }}>
            <Button
              label="Photo"
              variant="outline"
              onPress={() => void pickPhotos()}
              disabled={sending}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="Fichier"
              variant="outline"
              onPress={() => void pickDocuments()}
              disabled={sending}
            />
          </View>
        </View>
        <Field
          label="Message"
          value={draft}
          onChangeText={setDraft}
          placeholder="Écrire…"
        />
        <Button label="Envoyer" onPress={send} loading={sending} />
      </KeyboardAvoidingView>
    </Screen>
  );
}
