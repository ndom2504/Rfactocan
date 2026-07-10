import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text } from "react-native";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate, formatMoney } from "@/lib/format";
import {
  Badge,
  Button,
  Card,
  ErrorText,
  Muted,
  Screen,
  Title,
} from "@/components/ui";
import { colors } from "@/lib/theme";

type Trip = {
  id: string;
  userId: string;
  fromCity: string;
  toCity: string;
  fromCountry: string;
  toCountry: string;
  departAt: string;
  weightKg: number;
  pricePerKgCad: number;
  currency?: string;
  acceptedGoods: string;
  notes?: string | null;
  status: string;
  user: { displayName: string };
};

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api<{ trip: Trip }>(`/api/trips/${id}`);
      setTrip(data.trip);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.accent} />
      </Screen>
    );
  }

  if (!trip) {
    return (
      <Screen>
        <ErrorText>{error || "Voyage introuvable"}</ErrorText>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView>
        <Title>
          {trip.fromCity} → {trip.toCity}
        </Title>
        <Muted>
          {trip.fromCountry} → {trip.toCountry}
        </Muted>
        <Card>
          <Muted>Départ : {formatDate(trip.departAt)}</Muted>
          <Muted>Poids dispo : {trip.weightKg} kg</Muted>
          <Muted>
            Prix :{" "}
            {formatMoney(trip.pricePerKgCad, trip.currency || "CAD")}/kg
          </Muted>
          <Muted>Voyageur : {trip.user.displayName}</Muted>
          <Badge>{trip.status}</Badge>
        </Card>
        <Card>
          <Text style={{ fontWeight: "700", color: colors.foreground }}>
            Objets acceptés
          </Text>
          <Muted>{trip.acceptedGoods}</Muted>
          {trip.notes ? <Muted>{trip.notes}</Muted> : null}
        </Card>
        <ErrorText>{error}</ErrorText>
        {user?.id !== trip.userId ? (
          <Button
            label="Voir les demandes / postuler"
            onPress={() => router.push("/(tabs)/requests")}
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}
