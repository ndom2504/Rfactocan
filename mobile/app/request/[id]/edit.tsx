import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Button, ErrorText, Field, Muted, Screen, Title } from "@/components/ui";
import { api } from "@/lib/api";
import { CorridorFields } from "@/components/geo-fields";
import { useI18n } from "@/lib/i18n";

export default function EditRequestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const [fromCountry, setFromCountry] = useState("");
  const [fromCity, setFromCity] = useState("");
  const [toCountry, setToCountry] = useState("");
  const [toCity, setToCity] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api<{
        request: {
          fromCountry: string;
          fromCity: string;
          toCountry: string;
          toCity: string;
          weightKg: number;
          description: string;
        };
      }>(`/api/requests/${id}`);
      const req = data.request;
      setFromCountry(req.fromCountry);
      setFromCity(req.fromCity);
      setToCountry(req.toCountry);
      setToCity(req.toCity);
      setWeightKg(String(req.weightKg));
      setDescription(req.description);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function save() {
    if (!id) return;
    setSaving(true);
    setError("");
    try {
      await api(`/api/requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          fromCountry: fromCountry.trim().toUpperCase(),
          fromCity: fromCity.trim(),
          toCountry: toCountry.trim().toUpperCase(),
          toCity: toCity.trim(),
          weightKg: Number(weightKg),
          description: description.trim(),
        }),
      });
      router.replace(`/request/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <Muted>{t("loading")}</Muted>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <Title>{t("edit")}</Title>
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
          />
          <ErrorText>{error}</ErrorText>
          <Button label={t("save")} onPress={() => void save()} loading={saving} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
