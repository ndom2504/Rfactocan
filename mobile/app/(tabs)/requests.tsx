import { Link, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { Badge, Card, ErrorText, Muted, Screen } from "@/components/ui";
import { colors } from "@/lib/theme";

type RequestItem = {
  id: string;
  fromCity: string;
  toCity: string;
  weightKg: number;
  description: string;
  urgency: string;
  status: string;
  desiredDate?: string | null;
  user?: { displayName: string };
};

export default function RequestsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<RequestItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [mine, setMine] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const q = mine ? "?mine=1" : "";
      const data = await api<{ requests: RequestItem[] }>(`/api/requests${q}`);
      setItems(data.requests ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [mine]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <Screen style={{ paddingBottom: 0 }}>
      <View
        style={{
          flexDirection: "row",
          gap: 8,
          marginBottom: 12,
          alignItems: "center",
        }}
      >
        <Pressable
          onPress={() => setMine(false)}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 999,
            backgroundColor: !mine ? colors.accent : colors.surface2,
          }}
        >
          <Text style={{ color: !mine ? "#fff" : colors.foreground }}>
            Toutes
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setMine(true)}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 999,
            backgroundColor: mine ? colors.accent : colors.surface2,
          }}
        >
          <Text style={{ color: mine ? "#fff" : colors.foreground }}>
            Mes demandes
          </Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={() => router.push("/request/new")}
          style={{
            backgroundColor: colors.accent,
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 22, fontWeight: "700" }}>
            +
          </Text>
        </Pressable>
      </View>
      <ErrorText>{error}</ErrorText>
      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={load}
          ListEmptyComponent={<Muted>Aucune demande pour le moment.</Muted>}
          renderItem={({ item }) => (
            <Link href={`/request/${item.id}`} asChild>
              <Pressable>
                <Card>
                  <Text
                    style={{
                      fontWeight: "700",
                      fontSize: 16,
                      color: colors.foreground,
                    }}
                  >
                    {item.fromCity} → {item.toCity}
                  </Text>
                  <Muted>
                    {item.weightKg} kg
                    {item.desiredDate
                      ? ` · ${formatDate(item.desiredDate)}`
                      : ""}
                  </Muted>
                  <Muted>{item.description}</Muted>
                  <Badge>{item.status}</Badge>
                </Card>
              </Pressable>
            </Link>
          )}
        />
      )}
    </Screen>
  );
}
