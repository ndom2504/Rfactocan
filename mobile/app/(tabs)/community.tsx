import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Text } from "react-native";
import { Card, ErrorText, Muted, Screen } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { colors } from "@/lib/theme";

type Post = {
  id: string;
  kind?: string;
  title?: string | null;
  body: string;
  createdAt: string;
  source?: string;
  author?: { displayName?: string };
  commentCount?: number;
};

export default function CommunityScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api<{ posts: Post[] }>("/api/community/posts");
      setPosts(data.posts ?? []);
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
          data={posts}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={load}
          ListEmptyComponent={<Muted>Aucune publication pour le moment.</Muted>}
          renderItem={({ item }) => (
            <Card>
              <Text style={{ fontWeight: "700", color: colors.foreground }}>
                {item.title?.trim() || item.author?.displayName || "Publication"}
              </Text>
              <Muted>
                {item.author?.displayName ? `${item.author.displayName} · ` : ""}
                {formatDate(item.createdAt)}
                {item.commentCount ? ` · ${item.commentCount} commentaire(s)` : ""}
              </Muted>
              <Text style={{ color: colors.foreground, marginTop: 8 }} numberOfLines={5}>
                {item.body}
              </Text>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
