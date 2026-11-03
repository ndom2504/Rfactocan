import { type Href, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Image, ScrollView, Text, View } from "react-native";
import { Badge, Button, Card, ErrorText, Muted, Screen, Title } from "@/components/ui";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { shopCategoryLabel } from "@/lib/shops-catalog";
import { colors } from "@/lib/theme";

type ServiceRow = {
  id: string;
  title: string;
  city?: string;
  country?: string;
  status: string;
  photos?: string[];
  priceAmount?: number | null;
  currency?: string;
};

type ProductRow = {
  id: string;
  title: string;
  priceCents: number;
  photoUrl?: string | null;
  photosJson?: string | null;
  active: boolean;
};

type ShopRow = {
  id: string;
  name: string;
  city?: string;
  country?: string;
  category?: string;
  status: string;
  currency?: string;
  coverUrl?: string | null;
  logoUrl?: string | null;
  products?: ProductRow[];
  _count?: { products?: number };
};

function productCover(product: ProductRow) {
  if (product.photoUrl) return product.photoUrl;
  try {
    const photos = JSON.parse(product.photosJson || "[]") as unknown;
    if (Array.isArray(photos) && typeof photos[0] === "string") return photos[0];
  } catch {
    /* ignore */
  }
  return null;
}

export default function MyProjectsScreen() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const [svc, shop] = await Promise.all([
        api<{ listings?: ServiceRow[] }>("/api/services?mine=1"),
        api<{ shops?: ShopRow[] }>("/api/shops?mine=1"),
      ]);
      setServices(svc.listings ?? []);
      setShops(shop.shops ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function deleteService(id: string) {
    setBusyId(id);
    setError("");
    try {
      await api(`/api/services/${id}`, { method: "DELETE" });
      setServices((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setBusyId(null);
    }
  }

  async function setServiceStatus(id: string, status: "OPEN" | "PAUSED") {
    setBusyId(id);
    setError("");
    try {
      await api(`/api/services/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setServices((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setBusyId(null);
    }
  }

  async function setShopStatus(id: string, action: "publish" | "pause") {
    setBusyId(id);
    setError("");
    try {
      await api(`/api/shops/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      const status = action === "publish" ? "OPEN" : "DRAFT";
      setShops((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setBusyId(null);
    }
  }

  async function setProductActive(shopId: string, productId: string, active: boolean) {
    setBusyId(productId);
    setError("");
    try {
      await api(`/api/shops/products/${productId}`, {
        method: "PATCH",
        body: JSON.stringify({ active }),
      });
      setShops((prev) =>
        prev.map((shop) =>
          shop.id === shopId
            ? {
                ...shop,
                products: (shop.products ?? []).map((p) =>
                  p.id === productId ? { ...p, active } : p
                ),
              }
            : shop
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setBusyId(null);
    }
  }

  function serviceOptions(s: ServiceRow) {
    Alert.alert(t("my_projects_options"), s.title, [
      {
        text: t("my_projects_edit"),
        onPress: () => router.push(`/service/${s.id}/edit` as Href),
      },
      {
        text: s.status === "PAUSED" ? t("my_projects_resume") : t("my_projects_pause"),
        onPress: () =>
          void setServiceStatus(s.id, s.status === "PAUSED" ? "OPEN" : "PAUSED"),
      },
      {
        text: t("my_projects_delete"),
        style: "destructive",
        onPress: () =>
          Alert.alert(t("my_projects_delete"), t("my_projects_delete_service_confirm"), [
            { text: t("cancel"), style: "cancel" },
            {
              text: t("my_projects_delete"),
              style: "destructive",
              onPress: () => void deleteService(s.id),
            },
          ]),
      },
      { text: t("cancel"), style: "cancel" },
    ]);
  }

  function shopOptions(s: ShopRow) {
    Alert.alert(t("my_projects_options"), s.name, [
      {
        text: t("my_projects_edit"),
        onPress: () => router.push(`/shops/${s.id}/manage` as Href),
      },
      {
        text: s.status === "OPEN" ? t("my_projects_pause") : t("my_projects_resume"),
        onPress: () => void setShopStatus(s.id, s.status === "OPEN" ? "pause" : "publish"),
      },
      {
        text: t("my_projects_delete"),
        style: "destructive",
        onPress: () =>
          Alert.alert(t("my_projects_delete"), t("my_projects_delete_shop_confirm"), [
            { text: t("cancel"), style: "cancel" },
            {
              text: t("my_projects_delete"),
              style: "destructive",
              onPress: () => void deleteShop(s.id),
            },
          ]),
      },
      { text: t("cancel"), style: "cancel" },
    ]);
  }

  function productOptions(shop: ShopRow, product: ProductRow) {
    Alert.alert(t("my_projects_options"), product.title, [
      {
        text: t("my_projects_edit"),
        onPress: () => router.push(`/shops/${shop.id}/manage` as Href),
      },
      {
        text: product.active ? t("my_projects_pause") : t("my_projects_resume"),
        onPress: () => void setProductActive(shop.id, product.id, !product.active),
      },
      {
        text: t("my_projects_delete"),
        style: "destructive",
        onPress: () =>
          void (async () => {
            setBusyId(product.id);
            try {
              await api(`/api/shops/products/${product.id}`, { method: "DELETE" });
              setShops((prev) =>
                prev.map((row) =>
                  row.id === shop.id
                    ? {
                        ...row,
                        products: (row.products ?? []).map((p) =>
                          p.id === product.id ? { ...p, active: false } : p
                        ),
                      }
                    : row
                )
              );
            } catch (e) {
              setError(e instanceof Error ? e.message : t("retry"));
            } finally {
              setBusyId(null);
            }
          })(),
      },
      { text: t("cancel"), style: "cancel" },
    ]);
  }

  async function deleteShop(id: string) {
    setBusyId(id);
    setError("");
    try {
      await api(`/api/shops/${id}`, { method: "DELETE" });
      setShops((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setBusyId(null);
    }
  }

  const empty = !loading && services.length === 0 && shops.length === 0;

  return (
    <Screen>
      <ScrollView>
        <Title>{t("my_projects_title")}</Title>
        <Muted>{t("my_projects_subtitle")}</Muted>
        <Button
          label={t("shops_create_title")}
          onPress={() => router.push("/shops/new" as Href)}
        />
        <Button
          label={t("publish_listing_cta")}
          variant="outline"
          onPress={() => router.push("/service/new")}
        />
        <ErrorText>{error}</ErrorText>
        {loading ? <Muted>{t("loading")}</Muted> : null}
        {empty ? (
          <Card>
            <Text style={{ fontWeight: "700", color: colors.foreground }}>
              {t("my_projects_empty_title")}
            </Text>
            <Muted>{t("my_projects_empty_hint")}</Muted>
          </Card>
        ) : null}

        {services.length ? <Title>{t("my_projects_services")}</Title> : null}
        {services.map((s) => (
          <Card key={s.id}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {s.photos?.[0] ? (
                <Image
                  source={{ uri: s.photos[0] }}
                  style={{ width: 88, height: 88, borderRadius: 12 }}
                />
              ) : (
                <View
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: 12,
                    backgroundColor: colors.surface2,
                  }}
                />
              )}
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontWeight: "700", color: colors.foreground }}>
                  {s.title}
                </Text>
                <Muted>
                  {[s.city, s.country].filter(Boolean).join(", ") || "—"} · {s.status}
                </Muted>
                {s.priceAmount != null ? (
                  <Text style={{ color: colors.foreground }}>
                    {s.priceAmount} {s.currency ?? ""}
                  </Text>
                ) : null}
              </View>
            </View>
            <Button
              label={t("my_projects_options")}
              variant="outline"
              onPress={() => serviceOptions(s)}
              disabled={busyId === s.id}
            />
          </Card>
        ))}

        {shops.length ? <Title>{t("my_projects_shops")}</Title> : null}
        {shops.map((s) => {
          const cover = s.coverUrl || s.logoUrl || s.products?.[0]?.photoUrl || null;
          return (
          <Card key={s.id}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {cover ? (
                <Image
                  source={{ uri: cover }}
                  style={{ width: 88, height: 88, borderRadius: 12 }}
                />
              ) : (
                <View
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: 12,
                    backgroundColor: colors.surface2,
                  }}
                />
              )}
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontWeight: "700", color: colors.foreground }}>
                  {s.name}
                </Text>
                <Muted>
                  {s.category ? `${shopCategoryLabel(s.category, locale)} · ` : ""}
                  {[s.city, s.country].filter(Boolean).join(", ") || "—"}
                </Muted>
                <Badge>{s.status}</Badge>
              </View>
            </View>
            {(s.products ?? []).length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {(s.products ?? []).map((product) => {
                    const photo = productCover(product);
                    return (
                      <View key={product.id} style={{ width: 120, opacity: product.active ? 1 : 0.55 }}>
                        {photo ? (
                          <Image
                            source={{ uri: photo }}
                            style={{ width: 120, height: 80, borderRadius: 10 }}
                          />
                        ) : (
                          <View
                            style={{
                              width: 120,
                              height: 80,
                              borderRadius: 10,
                              backgroundColor: colors.surface2,
                            }}
                          />
                        )}
                        <Text numberOfLines={1} style={{ color: colors.foreground, marginTop: 4 }}>
                          {product.title}
                        </Text>
                        <Button
                          label={t("my_projects_options")}
                          variant="outline"
                          onPress={() => productOptions(s, product)}
                        />
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            ) : null}
            <Button
              label={t("my_projects_options")}
              variant="outline"
              onPress={() => shopOptions(s)}
              disabled={busyId === s.id}
            />
          </Card>
          );
        })}
      </ScrollView>
    </Screen>
  );
}
