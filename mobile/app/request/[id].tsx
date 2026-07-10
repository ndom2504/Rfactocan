import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/format";
import {
  Badge,
  Button,
  Card,
  ErrorText,
  Field,
  Muted,
  Screen,
  Title,
} from "@/components/ui";
import { colors } from "@/lib/theme";

type RequestDetail = {
  id: string;
  userId: string;
  fromCity: string;
  toCity: string;
  fromCountry: string;
  toCountry: string;
  weightKg: number;
  description: string;
  urgency: string;
  status: string;
  desiredDate?: string | null;
  user: { displayName: string };
};

type MyTrip = {
  id: string;
  fromCity: string;
  toCity: string;
  departAt: string;
  weightKg: number;
};

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [trips, setTrips] = useState<MyTrip[]>([]);
  const [tripId, setTripId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [reqData, tripsData] = await Promise.all([
        api<{ request: RequestDetail }>(`/api/requests/${id}`),
        api<{ trips: MyTrip[] }>("/api/trips?mine=1"),
      ]);
      setRequest(reqData.request);
      setTrips(tripsData.trips ?? []);
      if (tripsData.trips?.[0]) setTripId(tripsData.trips[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function apply() {
    if (!request || !tripId) {
      setError("Sélectionnez un de vos voyages (ID).");
      return;
    }
    setApplying(true);
    setError("");
    try {
      const data = await api<{ booking: { id: string } }>("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          requestId: request.id,
          tripId,
          goodsCertified: true,
          customsAcknowledged: true,
        }),
      });
      router.push(`/booking/${data.booking.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de postuler");
    } finally {
      setApplying(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.accent} />
      </Screen>
    );
  }

  if (!request) {
    return (
      <Screen>
        <ErrorText>{error || "Demande introuvable"}</ErrorText>
      </Screen>
    );
  }

  const isOwner = user?.id === request.userId;

  return (
    <Screen>
      <ScrollView>
        <Title>
          {request.fromCity} → {request.toCity}
        </Title>
        <Card>
          <Muted>
            {request.weightKg} kg
            {request.desiredDate
              ? ` · souhaité ${formatDate(request.desiredDate)}`
              : ""}
          </Muted>
          <Muted>Expéditeur : {request.user.displayName}</Muted>
          <Badge>{request.status}</Badge>
          <Text
            style={{ marginTop: 10, color: colors.foreground, lineHeight: 22 }}
          >
            {request.description}
          </Text>
        </Card>

        {!isOwner ? (
          <Card>
            <Text style={{ fontWeight: "700", color: colors.foreground }}>
              Postuler avec un voyage
            </Text>
            <Muted>
              Entrez l&apos;ID d&apos;un de vos voyages ou utilisez le premier
              listé.
            </Muted>
            {trips.map((t) => (
              <Muted key={t.id}>
                {t.id.slice(0, 8)}… · {t.fromCity}→{t.toCity} ·{" "}
                {formatDate(t.departAt)}
              </Muted>
            ))}
            <Field
              label="ID voyage"
              value={tripId}
              onChangeText={setTripId}
              autoCapitalize="none"
            />
            <ErrorText>{error}</ErrorText>
            <Button
              label="Postuler"
              onPress={apply}
              loading={applying}
              disabled={!tripId}
            />
          </Card>
        ) : (
          <View>
            <Muted>C&apos;est votre demande. Attendez les candidatures.</Muted>
            <ErrorText>{error}</ErrorText>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
