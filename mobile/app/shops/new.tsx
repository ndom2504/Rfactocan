import { type Href, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Chip, ChipRow } from "@/components/chip";
import { CountryCityFields } from "@/components/geo-fields";
import { Button, ErrorText, Field, Muted, Screen, Title } from "@/components/ui";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { currencyForCountry } from "@/lib/services-catalog";
import { SHOP_CATEGORIES, type ShopCategoryId } from "@/lib/shops-catalog";

const CURRENCIES = ["CAD", "USD", "EUR", "XOF", "XAF"] as const;

export default function NewShopScreen() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [category, setCategory] = useState<ShopCategoryId>("food_appliances");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [country, setCountry] = useState("GA");
  const [city, setCity] = useState("");
  const [currency, setCurrency] = useState(currencyForCountry("GA"));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setError("");
    try {
      const data = await api<{ shop: { id: string } }>("/api/shops", {
        method: "POST",
        body: JSON.stringify({
          category,
          name: name.trim(),
          description: description.trim(),
          country: country.trim().toUpperCase(),
          city: city.trim(),
          currency,
        }),
      });
      router.replace(`/shops/${data.shop.id}/manage` as Href);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <Title>{t("shops_create_title")}</Title>
          <Muted>{t("shops_create_lead")}</Muted>
          <Muted>{t("shops_category")}</Muted>
          <ChipRow>
            {SHOP_CATEGORIES.map((c) => (
              <Chip
                key={c.id}
                label={locale === "en" ? c.en : c.fr}
                selected={category === c.id}
                onPress={() => setCategory(c.id)}
              />
            ))}
          </ChipRow>
          <Field label={t("shops_name")} value={name} onChangeText={setName} />
          <Field
            label={t("shops_description")}
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <CountryCityFields
            country={country}
            city={city}
            onCountry={(v) => {
              setCountry(v);
              setCurrency(currencyForCountry(v));
            }}
            onCity={setCity}
          />
          <ChipRow>
            {CURRENCIES.map((code) => (
              <Chip
                key={code}
                label={code}
                selected={currency === code}
                onPress={() => setCurrency(code)}
              />
            ))}
          </ChipRow>
          <ErrorText>{error}</ErrorText>
          <Button
            label={t("shops_create_title")}
            onPress={() => void save()}
            loading={saving}
            disabled={name.trim().length < 2 || city.trim().length < 2}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
