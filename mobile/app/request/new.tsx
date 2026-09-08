import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { api } from "@/lib/api";
import { CorridorFields } from "@/components/geo-fields";
import {
  Button,
  ErrorText,
  Field,
  Muted,
  Screen,
  Title,
} from "@/components/ui";

export default function NewRequestScreen() {
  const router = useRouter();
  const [fromCountry, setFromCountry] = useState("CA");
  const [fromCity, setFromCity] = useState("Montréal");
  const [toCountry, setToCountry] = useState("GA");
  const [toCity, setToCity] = useState("Libreville");
  const [weightKg, setWeightKg] = useState("5");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError("");
    try {
      const data = await api<{ request: { id: string } }>("/api/requests", {
        method: "POST",
        body: JSON.stringify({
          needType: "PARCEL",
          fromCountry: fromCountry.trim().toUpperCase(),
          fromCity: fromCity.trim(),
          toCountry: toCountry.trim().toUpperCase(),
          toCity: toCity.trim(),
          weightKg: Number(weightKg),
          description: description.trim(),
          urgency: "NORMAL",
        }),
      });
      router.replace(`/request/${data.request.id}`);
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
          <Title>Nouvelle demande</Title>
          <Muted>Décrivez le colis à envoyer.</Muted>
          <CorridorFields
            fromCountry={fromCountry}
            fromCity={fromCity}
            toCountry={toCountry}
            toCity={toCity}
            onFromCountry={setFromCountry}
            onFromCity={setFromCity}
            onToCountry={setToCountry}
            onToCity={setToCity}
          />
          <Field
            label="Poids (kg)"
            keyboardType="decimal-pad"
            value={weightKg}
            onChangeText={setWeightKg}
          />
          <Field
            label="Description"
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="Documents et vêtements pour la famille…"
          />
          <ErrorText>{error}</ErrorText>
          <Button label="Publier" onPress={submit} loading={loading} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
