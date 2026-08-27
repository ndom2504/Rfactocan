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

export default function NewServiceScreen() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [country, setCountry] = useState("GA");
  const [city, setCity] = useState("Libreville");
  const [priceAmount, setPriceAmount] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    const price = Number(priceAmount.replace(",", "."));
    if (!Number.isFinite(price) || price <= 0) {
      setError("Indiquez un prix supérieur à 0.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api("/api/services", {
        method: "POST",
        body: JSON.stringify({
          category: "autre",
          serviceType: "autre",
          title: title.trim(),
          description: description.trim(),
          country: country.trim().toUpperCase(),
          city: city.trim(),
          priceAmount: price,
          priceUnit: "forfait",
        }),
      });
      router.replace("/(tabs)/community");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publication impossible");
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
          <Title>Publier un service</Title>
          <Muted>
            L’annonce apparaît tout de suite dans le fil Communauté.
          </Muted>
          <Field
            label="Titre"
            value={title}
            onChangeText={setTitle}
            placeholder="Ex. Cours de français, ménage, taxi…"
          />
          <Field
            label="Description"
            value={description}
            onChangeText={setDescription}
            multiline
            style={{ minHeight: 96, textAlignVertical: "top" }}
            placeholder="Décrivez le service (au moins 10 caractères)…"
          />
          <Field label="Pays" value={country} onChangeText={setCountry} />
          <Field label="Ville" value={city} onChangeText={setCity} />
          <Field
            label="Prix"
            keyboardType="decimal-pad"
            value={priceAmount}
            onChangeText={setPriceAmount}
            placeholder="0"
          />
          <ErrorText>{error}</ErrorText>
          <Button
            label="Publier"
            onPress={() => void submit()}
            loading={loading}
            disabled={loading}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
