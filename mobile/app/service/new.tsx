import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Chip, ChipRow } from "@/components/chip";
import {
  Button,
  ErrorText,
  Field,
  Muted,
  Screen,
  Title,
} from "@/components/ui";
import { api, mediaUrl, uploadFile } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import {
  catalogLabel,
  currencyForCountry,
  encodeTransportServiceType,
  PRICE_UNITS,
  SERVICE_CATALOG,
  TRANSPORT_MODES,
  transportTypesForMode,
} from "@/lib/services-catalog";
import { useOptionalTheme } from "@/lib/theme-context";
import { colors as lightColors } from "@/lib/theme";

export default function NewServiceScreen() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const colors = useOptionalTheme()?.colors ?? lightColors;
  const [category, setCategory] = useState(SERVICE_CATALOG[0].id);
  const cat = SERVICE_CATALOG.find((c) => c.id === category) ?? SERVICE_CATALOG[0];
  const [serviceType, setServiceType] = useState(cat.types[0]?.id ?? "autre");
  const [transportMode, setTransportMode] = useState("ROAD");
  const [transportType, setTransportType] = useState("TAXI");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [country, setCountry] = useState("GA");
  const [city, setCity] = useState("");
  const [priceAmount, setPriceAmount] = useState("");
  const [priceUnit, setPriceUnit] = useState("forfait");
  const [currency, setCurrency] = useState(currencyForCountry("GA"));
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const transportTypes = useMemo(
    () => transportTypesForMode(transportMode),
    [transportMode]
  );

  useEffect(() => {
    setCurrency(currencyForCountry(country));
  }, [country]);

  useEffect(() => {
    if (category === "transport") return;
    if (!cat.types.some((x) => x.id === serviceType)) {
      setServiceType(cat.types[0]?.id ?? "autre");
    }
  }, [category, cat, serviceType]);

  useEffect(() => {
    if (!transportTypes.some((x) => x.id === transportType)) {
      setTransportType(transportTypes[0]?.id ?? "CAR");
    }
  }, [transportMode, transportType, transportTypes]);

  async function pickPhotos() {
    if (photos.length >= 5) {
      setError("Maximum 5 photos.");
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("Autorisez l’accès aux photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 5 - photos.length,
    });
    if (result.canceled) return;
    setUploading(true);
    setError("");
    try {
      const uploaded: string[] = [];
      for (const asset of result.assets ?? []) {
        const name = asset.fileName || `photo-${Date.now()}.jpg`;
        const file = await uploadFile("/api/services/upload", {
          uri: asset.uri,
          name,
          type: asset.mimeType || "image/jpeg",
        });
        uploaded.push(file.url);
      }
      setPhotos((prev) => [...prev, ...uploaded].slice(0, 5));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("services_publish_error"));
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    const price = Number(priceAmount.replace(",", "."));
    if (!title.trim()) {
      setError("Indiquez un titre.");
      return;
    }
    if (description.trim().length < 10) {
      setError("Décrivez le service (au moins 10 caractères).");
      return;
    }
    if (city.trim().length < 2) {
      setError("Indiquez une ville.");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError("Indiquez un prix supérieur à 0.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const resolvedType =
        category === "transport"
          ? encodeTransportServiceType(transportMode, transportType)
          : serviceType;
      await api("/api/services", {
        method: "POST",
        body: JSON.stringify({
          category,
          serviceType: resolvedType,
          title: title.trim(),
          description: description.trim(),
          country: country.trim().toUpperCase(),
          city: city.trim(),
          priceAmount: price,
          priceUnit,
          currency,
          photos,
          websiteUrl: websiteUrl.trim() || undefined,
        }),
      });
      router.replace("/(tabs)/community");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("services_publish_error"));
    } finally {
      setLoading(false);
    }
  }

  const typeLabel =
    category === "vente"
      ? t("services_sale_sector")
      : category === "formation"
        ? t("services_formation_domain")
        : t("services_type");

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40, width: "100%" }}
        >
          <Title>{t("services_publish")}</Title>
          <Muted>{t("services_publish_hint")}</Muted>

          <Text
            style={{
              fontWeight: "700",
              color: colors.foreground,
              marginTop: 14,
              marginBottom: 8,
            }}
          >
            {t("services_category")}
          </Text>
          <ChipRow>
            {SERVICE_CATALOG.map((item) => (
              <Chip
                key={item.id}
                label={catalogLabel(item, locale)}
                selected={category === item.id}
                onPress={() => {
                  setCategory(item.id);
                  setServiceType(item.types[0]?.id ?? "autre");
                }}
              />
            ))}
          </ChipRow>

          {category === "transport" ? (
            <>
              <Text
                style={{
                  fontWeight: "700",
                  color: colors.foreground,
                  marginTop: 14,
                  marginBottom: 8,
                }}
              >
                {t("transport_mode")}
              </Text>
              <ChipRow>
                {TRANSPORT_MODES.map((item) => (
                  <Chip
                    key={item.code}
                    label={catalogLabel(item, locale)}
                    selected={transportMode === item.code}
                    onPress={() => setTransportMode(item.code)}
                  />
                ))}
              </ChipRow>
              <Text
                style={{
                  fontWeight: "700",
                  color: colors.foreground,
                  marginTop: 14,
                  marginBottom: 8,
                }}
              >
                {t("transport_type")}
              </Text>
              <ChipRow>
                {transportTypes.map((item) => (
                  <Chip
                    key={item.id}
                    label={catalogLabel(item, locale)}
                    selected={transportType === item.id}
                    onPress={() => setTransportType(item.id)}
                  />
                ))}
              </ChipRow>
            </>
          ) : (
            <>
              <Text
                style={{
                  fontWeight: "700",
                  color: colors.foreground,
                  marginTop: 14,
                  marginBottom: 8,
                }}
              >
                {typeLabel}
              </Text>
              <ChipRow>
                {cat.types.map((item) => (
                  <Chip
                    key={item.id}
                    label={catalogLabel(item, locale)}
                    selected={serviceType === item.id}
                    onPress={() => setServiceType(item.id)}
                  />
                ))}
              </ChipRow>
            </>
          )}

          <View style={{ height: 12 }} />
          <Field
            label={t("services_title_field")}
            value={title}
            onChangeText={setTitle}
            placeholder="Ex. Cours de français, ménage, taxi…"
          />
          <Field
            label={t("description")}
            value={description}
            onChangeText={setDescription}
            multiline
            style={{ minHeight: 96, textAlignVertical: "top", width: "100%" }}
            placeholder="Décrivez le service (au moins 10 caractères)…"
          />

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field
                label={t("country")}
                value={country}
                onChangeText={setCountry}
                autoCapitalize="characters"
                placeholder="GA"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label={t("city")}
                value={city}
                onChangeText={setCity}
                placeholder="Libreville"
              />
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field
                label={t("services_price")}
                keyboardType="decimal-pad"
                value={priceAmount}
                onChangeText={setPriceAmount}
                placeholder="0"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label={t("currency")}
                value={currency}
                onChangeText={(v) => setCurrency(v.toUpperCase().slice(0, 3))}
                autoCapitalize="characters"
              />
            </View>
          </View>

          <Text
            style={{
              fontWeight: "700",
              color: colors.foreground,
              marginBottom: 8,
            }}
          >
            {t("services_price_unit")}
          </Text>
          <ChipRow>
            {PRICE_UNITS.map((item) => (
              <Chip
                key={item.id}
                label={catalogLabel(item, locale)}
                selected={priceUnit === item.id}
                onPress={() => setPriceUnit(item.id)}
              />
            ))}
          </ChipRow>

          <View style={{ height: 12 }} />
          <Field
            label={t("services_website")}
            value={websiteUrl}
            onChangeText={setWebsiteUrl}
            placeholder="https://…"
            autoCapitalize="none"
          />

          <Text
            style={{
              fontWeight: "700",
              color: colors.foreground,
              marginBottom: 8,
            }}
          >
            {t("services_photos")}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            {photos.map((url) => (
              <Pressable
                key={url}
                onPress={() => setPhotos((prev) => prev.filter((p) => p !== url))}
              >
                <Image
                  source={{ uri: mediaUrl(url) }}
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 10,
                    backgroundColor: colors.surface2,
                  }}
                />
              </Pressable>
            ))}
          </View>
          <Button
            label={photos.length ? t("add_photo") : t("services_photos")}
            variant="outline"
            onPress={() => void pickPhotos()}
            loading={uploading}
          />

          <ErrorText>{error}</ErrorText>
          <View style={{ marginTop: 8 }}>
            <Button
              label={t("publish")}
              onPress={() => void submit()}
              loading={loading}
              disabled={loading || uploading}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
