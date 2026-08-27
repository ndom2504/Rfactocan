import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text } from "react-native";
import { Card, ErrorText, Muted, Screen } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { colors } from "@/lib/theme";

type Thread = {
  id: string;
  lastMessageAt?: string | null;
  lastContextType?: string | null;
  peer?: { displayName?: string | null };
  lastMessage?: { body?: string | null; attachmentUrl?: string | null } | null;
};

export default function MessagesScreen() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api<{ threads: Thread[] }>("/api/dm");
      setThreads(data.threads ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <Screen style={{ paddingBottom: 0 }}>
      <ErrorText>{error}</ErrorText>
      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={load}
          ListEmptyComponent={
            <Muted>Aucune conversation pour le moment.</Muted>
          }
          renderItem={({ item }) => (
            <Link href={`/messages/${item.id}`} asChild>
              <Pressable>
                <Card>
                  <Text style={{ fontWeight: "700", color: colors.foreground }}>
                    {item.peer?.displayName || "Contact"}
                  </Text>
                  <Muted>
                    {item.lastMessage?.body?.trim() ||
                      (item.lastMessage?.attachmentUrl ? "Pièce jointe" : "Aucun message")}
                  </Muted>
                  {item.lastMessageAt ? (
                    <Muted>{formatDate(item.lastMessageAt)}</Muted>
                  ) : null}
                </Card>
              </Pressable>
            </Link>
          )}
        />
      )}
    </Screen>
  );
}
