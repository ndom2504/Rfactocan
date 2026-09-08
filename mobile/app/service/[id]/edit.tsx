import { type Href, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { CountryCityFields } from "@/components/geo-fields";
import { Button, ErrorText, Field, Muted, Screen, Title } from "@/components/ui";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function EditServiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [priceAmount, setPriceAmount] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api<{
        listing: {
          title: string;
          description: string;
          city: string;
          country: string;
          priceAmount: number | null;
        };
      }>(`/api/services/${id}`);
      const listing = data.listing;
      setTitle(listing.title);
      setDescription(listing.description);
      setCity(listing.city);
      setCountry(listing.country);
      setPriceAmount(
        listing.priceAmount != null ? String(listing.priceAmount) : ""
      );
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
      await api(`/api/services/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          city: city.trim(),
          country: country.trim().toUpperCase(),
          priceAmount: priceAmount ? Number(priceAmount) : undefined,
        }),
      });
      router.replace(`/service/${id}` as Href);
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
          <Field label={t("meet_headline")} value={title} onChangeText={setTitle} />
          <Field
            label="Description"
            value={description}
            onChangeText={setDescription}
            multiline
            style={{ minHeight: 80, textAlignVertical: "top" }}
          />
          <CountryCityFields
            country={country}
            city={city}
            onCountry={setCountry}
            onCity={setCity}
          />
          <Field
            label={t("svc_pay_amount")}
            keyboardType="decimal-pad"
            value={priceAmount}
            onChangeText={setPriceAmount}
          />
          <ErrorText>{error}</ErrorText>
          <Button label={t("save")} onPress={() => void save()} loading={saving} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
