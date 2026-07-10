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
import { formatDate, formatMoney } from "@/lib/format";
import { Badge, Card, ErrorText, Muted, Screen } from "@/components/ui";
import { colors } from "@/lib/theme";

type Trip = {
  id: string;
  fromCity: string;
  toCity: string;
  fromCountry: string;
  toCountry: string;
  departAt: string;
  weightKg: number;
  pricePerKgCad: number;
  currency?: string;
  status: string;
  user?: { displayName: string };
};

export default function TripsScreen() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [mine, setMine] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const q = mine ? "?mine=1" : "";
      const data = await api<{ trips: Trip[] }>(`/api/trips${q}`);
      setTrips(data.trips ?? []);
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
            Tous
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
            Mes voyages
          </Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={() => router.push("/trip/new")}
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
          data={trips}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={load}
          ListEmptyComponent={<Muted>Aucun voyage pour le moment.</Muted>}
          renderItem={({ item }) => (
            <Link href={`/trip/${item.id}`} asChild>
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
                    {formatDate(item.departAt)} · {item.weightKg} kg ·{" "}
                    {formatMoney(
                      item.pricePerKgCad,
                      item.currency || "CAD"
                    )}
                    /kg
                  </Muted>
                  {item.user?.displayName ? (
                    <Muted>{item.user.displayName}</Muted>
                  ) : null}
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
