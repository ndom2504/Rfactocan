import * as WebBrowser from "expo-web-browser";
import { useCallback, useState } from "react";
import { Image, ScrollView, Text } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Button, ErrorText, Muted, Screen, Title } from "@/components/ui";
import { api, mediaUrl } from "@/lib/api";
import { formatMoneyFromCents } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useOptionalTheme } from "@/lib/theme-context";
import { colors as lightColors } from "@/lib/theme";

type Product = {
  id: string;
  title: string;
  description?: string | null;
  photoUrl?: string | null;
  photos?: string[];
  effectivePriceCents?: number;
  priceCents?: number;
  shop?: {
    id: string;
    name: string;
    currency?: string | null;
  };
};

export default function ShopProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const colors = useOptionalTheme()?.colors ?? lightColors;
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setError("");
    try {
      const data = await api<{ product: Product }>(`/api/shops/products/${id}`);
      setProduct(data.product);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function buy() {
    if (!id) return;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ checkoutUrl?: string }>("/api/shops/checkout", {
        method: "POST",
        body: JSON.stringify({ productId: id, quantity: 1 }),
      });
      if (result.checkoutUrl) {
        await WebBrowser.openBrowserAsync(result.checkoutUrl);
      }
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

  if (!product) {
    return (
      <Screen>
        <ErrorText>{error}</ErrorText>
        <Button label={t("browse_shops")} onPress={() => router.push("/(tabs)/shops")} />
      </Screen>
    );
  }

  const photo = product.photos?.[0] || product.photoUrl;
  const currency = product.shop?.currency || "CAD";
  const price = product.effectivePriceCents ?? product.priceCents ?? 0;

  return (
    <Screen>
      <ScrollView>
        {photo ? (
          <Image
            source={{ uri: mediaUrl(photo) }}
            style={{
              width: "100%",
              height: 220,
              borderRadius: 14,
              marginBottom: 16,
              backgroundColor: colors.surface2,
            }}
            resizeMode="cover"
          />
        ) : null}
        <Title>{product.title}</Title>
        {product.shop?.name ? <Muted>{product.shop.name}</Muted> : null}
        <Text
          style={{
            color: colors.foreground,
            fontWeight: "800",
            fontSize: 20,
            marginVertical: 12,
          }}
        >
          {formatMoneyFromCents(price, currency)}
        </Text>
        {product.description ? (
          <Text style={{ color: colors.foreground, lineHeight: 22, marginBottom: 16 }}>
            {product.description}
          </Text>
        ) : null}
        <ErrorText>{error}</ErrorText>
        <Button label={t("shop_buy")} onPress={() => void buy()} loading={busy} />
        <Button
          label={t("shops_orders")}
          variant="outline"
          onPress={() => router.push("/shops/orders")}
        />
        {product.shop?.id ? (
          <Button
            label={t("browse_shops")}
            variant="outline"
            onPress={() => router.push(`/shops/${product.shop!.id}`)}
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}
