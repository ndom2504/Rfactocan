import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text } from "react-native";
import { Card, ErrorText, Muted, Screen } from "@/components/ui";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { colors } from "@/lib/theme";

type Listing = {
  id: string;
  title: string;
  city?: string | null;
  country?: string | null;
  priceAmount?: number | null;
  currency?: string | null;
  user?: { displayName?: string | null };
};

export default function ServicesScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Listing[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api<{ listings: Listing[] }>("/api/services");
      setItems(data.listings ?? []);
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
          data={items}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={load}
          ListEmptyComponent={<Muted>Aucun service publié.</Muted>}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push("/(tabs)/messages")}>
              <Card>
                <Text style={{ fontWeight: "700", color: colors.foreground }}>
                  {item.title}
                </Text>
                <Muted>
                  {[item.city, item.country].filter(Boolean).join(", ") || "—"}
                  {item.priceAmount != null
                    ? ` · ${formatMoney(item.priceAmount, item.currency || "CAD")}`
                    : ""}
                </Muted>
                {item.user?.displayName ? (
                  <Muted>{item.user.displayName}</Muted>
                ) : null}
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
