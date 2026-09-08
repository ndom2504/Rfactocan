import * as ImagePicker from "expo-image-picker";
import { type Href, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, Text } from "react-native";
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
import { CountryCityFields } from "@/components/geo-fields";
import { api, mediaUrl, uploadFile } from "@/lib/api";
import { IOS_IMAGE_PICKER, prepareImageUpload } from "@/lib/prepare-image";
import { formatMoneyFromCents } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { shopCategoryLabel } from "@/lib/shops-catalog";
import { colors } from "@/lib/theme";

type Product = {
  id: string;
  title: string;
  description?: string;
  priceCents: number;
  effectivePriceCents?: number;
  active: boolean;
  photoUrl?: string | null;
};

type Shop = {
  id: string;
  name: string;
  description: string;
  category: string;
  city: string;
  country: string;
  currency: string;
  status: string;
  isOwner?: boolean;
  products?: Product[];
};

export default function ManageShopScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, locale } = useI18n();
  const [shop, setShop] = useState<Shop | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [productDesc, setProductDesc] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setError("");
    try {
      const data = await api<{ shop: Shop }>(`/api/shops/${id}`);
      const next = data.shop;
      if (!next.isOwner) {
        setError("Interdit");
        setShop(null);
        return;
      }
      setShop(next);
      setName(next.name);
      setDescription(next.description ?? "");
      setCity(next.city);
      setCountry(next.country);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
      setShop(null);
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function saveShop(extra?: Record<string, unknown>) {
    if (!id) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api(`/api/shops/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          city: city.trim(),
          country: country.trim().toUpperCase(),
          ...extra,
        }),
      });
      setMessage(t("save"));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setBusy(false);
    }
  }

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("Permission photos refusée");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync(IOS_IMAGE_PICKER);
    if (result.canceled) return;
    const asset = result.assets[0];
    try {
      const file = await uploadFile(
        "/api/upload",
        await prepareImageUpload({
          ...asset,
          fileName: asset.fileName || `product-${Date.now()}.jpg`,
        })
      );
      setPhotoUrl(file.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    }
  }

  async function addProduct() {
    if (!id) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api(`/api/shops/${id}/products`, {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: productDesc.trim(),
          price: Number(price),
          photoUrl,
        }),
      });
      setTitle("");
      setPrice("");
      setProductDesc("");
      setPhotoUrl(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setBusy(false);
    }
  }

  async function deactivate(productId: string) {
    setBusy(true);
    setError("");
    try {
      await api(`/api/shops/products/${productId}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <Muted>{t("loading")}</Muted>
      </Screen>
    );
  }

  if (!shop) {
    return (
      <Screen>
        <ErrorText>{error}</ErrorText>
        <Button label={t("browse_shops")} onPress={() => router.push("/(tabs)/shops")} />
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
          <Title>{shop.name}</Title>
          <Muted>
            {shopCategoryLabel(shop.category, locale)} · {shop.city}, {shop.country}
          </Muted>
          <Badge>
            {shop.status === "OPEN"
              ? t("shops_status_open")
              : shop.status === "CLOSED"
                ? t("shops_status_closed")
                : t("shops_status_draft")}
          </Badge>
          <ErrorText>{error}</ErrorText>
          {message ? (
            <Text style={{ color: colors.accent, marginTop: 8 }}>{message}</Text>
          ) : null}

          <Field label={t("shops_name")} value={name} onChangeText={setName} />
          <CountryCityFields
            country={country}
            city={city}
            onCountry={setCountry}
            onCity={setCity}
          />
          <Field
            label={t("shops_description")}
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <Button
            label={t("save")}
            variant="outline"
            onPress={() => void saveShop()}
            loading={busy}
          />
          {shop.status !== "OPEN" ? (
            <Button
              label={t("shops_publish")}
              onPress={() => void saveShop({ action: "publish" })}
              loading={busy}
            />
          ) : (
            <Button
              label={t("shops_close")}
              variant="danger"
              onPress={() => void saveShop({ action: "close" })}
              disabled={busy}
            />
          )}
          {shop.status === "OPEN" ? (
            <Button
              label={t("shops_draft")}
              variant="outline"
              onPress={() => void saveShop({ action: "draft" })}
              disabled={busy}
            />
          ) : null}

          <Title>{t("shops_add_product")}</Title>
          <Field
            label={t("shops_product_title")}
            value={title}
            onChangeText={setTitle}
          />
          <Field
            label={t("shops_product_price")}
            keyboardType="decimal-pad"
            value={price}
            onChangeText={setPrice}
          />
          <Field
            label={t("shops_description")}
            value={productDesc}
            onChangeText={setProductDesc}
            multiline
          />
          {photoUrl ? (
            <Image
              source={{ uri: mediaUrl(photoUrl) }}
              style={{ width: "100%", height: 140, borderRadius: 12, marginBottom: 8 }}
            />
          ) : null}
          <Button label="Photo" variant="outline" onPress={() => void pickPhoto()} />
          <Button
            label={t("shops_add_product")}
            onPress={() => void addProduct()}
            loading={busy}
            disabled={title.trim().length < 2 || !Number(price)}
          />

          {(shop.products ?? []).map((p) => (
            <Card key={p.id}>
              <Text style={{ fontWeight: "700", color: colors.foreground }}>
                {p.title}
                {!p.active ? " · —" : ""}
              </Text>
              <Muted>
                {formatMoneyFromCents(
                  p.effectivePriceCents ?? p.priceCents,
                  shop.currency
                )}
              </Muted>
              {p.active ? (
                <Button
                  label={t("my_projects_delete")}
                  variant="danger"
                  onPress={() =>
                    Alert.alert(t("my_projects_delete"), p.title, [
                      { text: t("cancel"), style: "cancel" },
                      {
                        text: t("my_projects_delete"),
                        style: "destructive",
                        onPress: () => void deactivate(p.id),
                      },
                    ])
                  }
                  disabled={busy}
                />
              ) : null}
              <Button
                label={t("shop_buy")}
                variant="outline"
                onPress={() =>
                  router.push(`/shops/product/${p.id}` as Href)
                }
              />
            </Card>
          ))}

          <Button
            label={t("shops_orders")}
            variant="outline"
            onPress={() => router.push("/shops/orders")}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
