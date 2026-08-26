import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  View,
} from "react-native";
import { Button, ErrorText, Field, Muted, Screen } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/theme";

type Message = {
  id: string;
  body?: string | null;
  attachmentUrl?: string | null;
  senderId: string;
  createdAt: string;
};

export default function DirectChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [peer, setPeer] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setError("");
    try {
      const data = await api<{
        messages: Message[];
        peer?: { displayName?: string | null };
      }>(`/api/dm/${id}/messages`);
      setMessages(data.messages ?? []);
      setPeer(data.peer?.displayName || "Contact");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

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

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
      </Screen>
    );
  }

  return (
    <Screen style={{ paddingBottom: 8 }}>
      <Muted>{peer}</Muted>
      <ErrorText>{error}</ErrorText>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 12, gap: 8 }}
          renderItem={({ item }) => {
            const mine = item.senderId === user?.id;
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
                <Text style={{ color: mine ? "#fff" : colors.foreground }}>
                  {item.body?.trim() || (item.attachmentUrl ? "Pièce jointe" : "")}
                </Text>
              </View>
            );
          }}
        />
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
