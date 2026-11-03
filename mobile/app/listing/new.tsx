import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import { Button, ErrorText, Screen, Title } from "@/components/ui";
import { api, mediaUrl, uploadFile } from "@/lib/api";
import { IOS_IMAGE_PICKER, prepareImageUpload } from "@/lib/prepare-image";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { useOptionalTheme } from "@/lib/theme-context";
import { colors as lightColors } from "@/lib/theme";

export default function NewListingScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const gift = mode === "gift";
  const router = useRouter();
  const { t } = useI18n();
  const { user } = useAuth();
  const colors = useOptionalTheme()?.colors ?? lightColors;
  const [giftKind, setGiftKind] = useState<"produit" | "service">("produit");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState(
    (user?.country ?? "").trim().toUpperCase().slice(0, 2)
  );
  const [photo, setPhoto] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync(IOS_IMAGE_PICKER);
    if (result.canceled || !result.assets[0]) return;
    setBusy(true);
    setError("");
    try {
      const file = await prepareImageUpload(result.assets[0]);
      const uploaded = await uploadFile("/api/community/upload", file);
      setPhoto(uploaded.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    setBusy(true);
    setError("");
    try {
      const data = await api<{ listing?: { id: string }; error?: string }>(
        "/api/services",
        {
          method: "POST",
          body: JSON.stringify({
            category: gift ? "don" : "produit",
            serviceType: gift ? giftKind : "article",
            title: title.trim(),
            description: description.trim(),
            country: country.trim().toUpperCase(),
            city: city.trim(),
            priceAmount: gift ? 0 : Number(price.replace(",", ".")),
            priceUnit: "forfait",
            photos: photo ? [photo] : [],
          }),
        }
      );
      if (!data.listing?.id) {
        setError(data.error || t("retry"));
        return;
      }
      router.replace("/(tabs)/community");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setBusy(false);
    }
  }

  const needsPhoto = !gift || giftKind === "produit";
  const field = {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    color: colors.foreground,
    marginBottom: 10,
  };

  return (
    <Screen>
      <Title>{gift ? t("home_cta_give") : t("publish_intent_product")}</Title>
      <Text style={{ color: colors.muted, marginBottom: 12 }}>{t("listing_hint")}</Text>
      {gift ? (
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
          {(["produit", "service"] as const).map((kind) => (
            <Pressable
              key={kind}
              onPress={() => setGiftKind(kind)}
              style={{
                borderWidth: 1,
                borderColor: colors.accent,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: giftKind === kind ? colors.accent : "transparent",
              }}
            >
              <Text style={{ color: giftKind === kind ? "#fff" : colors.foreground }}>
                {kind === "produit"
                  ? t("publish_intent_product")
                  : t("publish_intent_service")}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder={t("listing_title")}
        placeholderTextColor={colors.muted}
        style={field}
      />
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder={t("description")}
        placeholderTextColor={colors.muted}
        multiline
        style={[field, { minHeight: 90 }]}
      />
      {gift ? null : (
        <TextInput
          value={price}
          onChangeText={setPrice}
          placeholder={t("listing_price")}
          placeholderTextColor={colors.muted}
          keyboardType="decimal-pad"
          style={field}
        />
      )}
      <TextInput
        value={city}
        onChangeText={setCity}
        placeholder={t("city")}
        placeholderTextColor={colors.muted}
        style={field}
      />
      <TextInput
        value={country}
        onChangeText={(v) => setCountry(v.toUpperCase().slice(0, 2))}
        placeholder={t("country")}
        placeholderTextColor={colors.muted}
        autoCapitalize="characters"
        style={field}
      />
      <Button label={t("listing_photo")} variant="outline" onPress={() => void pickPhoto()} />
      {photo ? (
        <Image
          source={{ uri: mediaUrl(photo) }}
          style={{ width: 120, height: 120, borderRadius: 12, marginVertical: 8 }}
        />
      ) : null}
      <ErrorText>{error}</ErrorText>
      <Button
        label={busy ? t("loading") : t("listing_publish")}
        onPress={() => void publish()}
        loading={busy}
        disabled={
          title.trim().length < 3 ||
          description.trim().length < 10 ||
          city.trim().length < 2 ||
          country.trim().length !== 2 ||
          (!gift && !(Number(price.replace(",", ".")) > 0)) ||
          (needsPhoto && !photo)
        }
      />
    </Screen>
  );
}
