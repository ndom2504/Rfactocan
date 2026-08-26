import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text } from "react-native";
import { Card, ErrorText, Muted, Screen } from "@/components/ui";
import { api } from "@/lib/api";
import { colors } from "@/lib/theme";

type Shop = {
  id: string;
  name: string;
  city?: string | null;
  country?: string | null;
  category?: string | null;
  user?: { displayName?: string | null };
  _count?: { products?: number };
};

export default function ShopsScreen() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api<{ shops: Shop[] }>("/api/shops");
      setShops(data.shops ?? []);
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
          data={shops}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={load}
          ListEmptyComponent={<Muted>Aucune boutique ouverte.</Muted>}
          renderItem={({ item }) => (
            <Link href={`/shops/${item.id}`} asChild>
              <Pressable>
                <Card>
                  <Text style={{ fontWeight: "700", color: colors.foreground }}>
                    {item.name}
                  </Text>
                  <Muted>
                    {[item.city, item.country].filter(Boolean).join(", ") || "—"}
                    {item._count?.products
                      ? ` · ${item._count.products} produit(s)`
                      : ""}
                  </Muted>
                  {item.user?.displayName ? (
                    <Muted>{item.user.displayName}</Muted>
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
