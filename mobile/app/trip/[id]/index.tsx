import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, ScrollView, Text } from "react-native";
import { api, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate, formatMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
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
import { parseCarrierFromNotes } from "@/lib/vehicle-notes";
import { transportModeLabel, transportTypeLabel } from "@/lib/transport";

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
  transportMode?: string | null;
  transportType?: string | null;
  acceptedGoods: string;
  notes?: string | null;
  status: string;
  user: { displayName: string };
};

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { t, locale } = useI18n();
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

  const carrier = useMemo(
    () => parseCarrierFromNotes(trip?.notes),
    [trip?.notes]
  );

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
          <Muted>
            {transportModeLabel(trip.transportMode, locale)}
            {trip.transportType
              ? ` · ${transportTypeLabel(trip.transportMode, trip.transportType, locale)}`
              : ""}
          </Muted>
          <Muted>Poids dispo : {trip.weightKg} kg</Muted>
          <Muted>
            Prix :{" "}
            {formatMoney(trip.pricePerKgCad, trip.currency || "CAD")}/kg
          </Muted>
          <Muted>Voyageur : {trip.user.displayName}</Muted>
          <Badge>{trip.status}</Badge>
        </Card>
        {carrier.vehicle ? (
          <Card>
            <Text style={{ fontWeight: "700", color: colors.foreground }}>
              {t("vehicle_section")}
            </Text>
            <Muted>
              {t("vehicle_plate")} : {carrier.vehicle.plate}
            </Muted>
            <Muted>
              {t("vehicle_license")} : {carrier.vehicle.licenseNumber}
            </Muted>
            {carrier.vehicle.photoUrl ? (
              <Image
                source={{ uri: mediaUrl(carrier.vehicle.photoUrl) }}
                style={{
                  width: "100%",
                  height: 160,
                  borderRadius: 10,
                  marginTop: 8,
                }}
              />
            ) : null}
          </Card>
        ) : null}
        {carrier.commercial ? (
          <Card>
            <Text style={{ fontWeight: "700", color: colors.foreground }}>
              {t("commercial_section")}
            </Text>
            <Muted>{carrier.commercial.company}</Muted>
            <Muted>
              {t("commercial_matricule")} : {carrier.commercial.matricule}
            </Muted>
            {carrier.commercial.insurance ? (
              <Muted>
                {t("commercial_insurance")} : {carrier.commercial.insurance}
              </Muted>
            ) : null}
            <Muted>
              {t("commercial_base")} : {carrier.commercial.base}
            </Muted>
          </Card>
        ) : null}
        <Card>
          <Text style={{ fontWeight: "700", color: colors.foreground }}>
            {t("accepted_goods")}
          </Text>
          <Muted>{trip.acceptedGoods}</Muted>
          {carrier.userNotes ? <Muted>{carrier.userNotes}</Muted> : null}
        </Card>
        <ErrorText>{error}</ErrorText>
        {user?.id === trip.userId ? (
          <Button
            label={t("edit")}
            variant="outline"
            onPress={() => router.push(`/trip/${id}/edit`)}
          />
        ) : (
          <Button
            label="Voir les demandes / postuler"
            onPress={() => router.push("/(tabs)/requests")}
          />
        )}
      </ScrollView>
    </Screen>
  );
}
