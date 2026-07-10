import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text } from "react-native";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { Badge, Card, ErrorText, Muted, Screen } from "@/components/ui";
import { colors } from "@/lib/theme";

type Booking = {
  id: string;
  status: string;
  request: { fromCity: string; toCity: string; weightKg: number };
  trip: { departAt: string; user: { displayName: string } };
  sender: { displayName: string };
};

export default function BookingsScreen() {
  const [items, setItems] = useState<Booking[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api<{ bookings: Booking[] }>("/api/bookings");
      setItems(data.bookings ?? []);
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
          ListEmptyComponent={<Muted>Aucune réservation.</Muted>}
          renderItem={({ item }) => (
            <Link href={`/booking/${item.id}`} asChild>
              <Pressable>
                <Card>
                  <Text
                    style={{
                      fontWeight: "700",
                      fontSize: 16,
                      color: colors.foreground,
                    }}
                  >
                    {item.request.fromCity} → {item.request.toCity}
                  </Text>
                  <Muted>
                    Départ {formatDate(item.trip.departAt)} ·{" "}
                    {item.request.weightKg} kg
                  </Muted>
                  <Muted>
                    {item.sender.displayName} ↔ {item.trip.user.displayName}
                  </Muted>
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
