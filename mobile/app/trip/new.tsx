import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { api } from "@/lib/api";
import {
  Button,
  ErrorText,
  Field,
  Muted,
  Screen,
  Title,
} from "@/components/ui";

export default function NewTripScreen() {
  const router = useRouter();
  const [fromCountry, setFromCountry] = useState("CA");
  const [fromCity, setFromCity] = useState("Montréal");
  const [toCountry, setToCountry] = useState("GA");
  const [toCity, setToCity] = useState("Libreville");
  const [departAt, setDepartAt] = useState("");
  const [weightKg, setWeightKg] = useState("10");
  const [pricePerKgCad, setPricePerKgCad] = useState("20");
  const [currency, setCurrency] = useState("CAD");
  const [acceptedGoods, setAcceptedGoods] = useState(
    "Vêtements, documents, produits non périssables"
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError("");
    try {
      const depart = departAt.trim()
        ? new Date(departAt).toISOString()
        : new Date(Date.now() + 7 * 86400000).toISOString();
      const data = await api<{ trip: { id: string } }>("/api/trips", {
        method: "POST",
        body: JSON.stringify({
          fromCountry: fromCountry.trim().toUpperCase(),
          fromCity: fromCity.trim(),
          toCountry: toCountry.trim().toUpperCase(),
          toCity: toCity.trim(),
          departAt: depart,
          weightKg: Number(weightKg),
          pricePerKgCad: Number(pricePerKgCad),
          currency: currency.trim().toUpperCase(),
          acceptedGoods: acceptedGoods.trim(),
        }),
      });
      router.replace(`/trip/${data.trip.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <Title>Nouveau voyage</Title>
          <Muted>
            Date : AAAA-MM-JJ ou AAAA-MM-JJTHH:mm (sinon +7 jours).
          </Muted>
          <Field label="Pays départ (ISO)" value={fromCountry} onChangeText={setFromCountry} />
          <Field label="Ville départ" value={fromCity} onChangeText={setFromCity} />
          <Field label="Pays arrivée (ISO)" value={toCountry} onChangeText={setToCountry} />
          <Field label="Ville arrivée" value={toCity} onChangeText={setToCity} />
          <Field
            label="Date départ"
            value={departAt}
            onChangeText={setDepartAt}
            placeholder="2026-08-01T10:00"
          />
          <Field
            label="Poids (kg)"
            keyboardType="decimal-pad"
            value={weightKg}
            onChangeText={setWeightKg}
          />
          <Field
            label="Prix / kg"
            keyboardType="decimal-pad"
            value={pricePerKgCad}
            onChangeText={setPricePerKgCad}
          />
          <Field
            label="Devise (CAD/USD/EUR/XOF/XAF)"
            autoCapitalize="characters"
            value={currency}
            onChangeText={setCurrency}
          />
          <Field
            label="Objets acceptés"
            value={acceptedGoods}
            onChangeText={setAcceptedGoods}
            multiline
          />
          <ErrorText>{error}</ErrorText>
          <Button label="Publier" onPress={submit} loading={loading} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
