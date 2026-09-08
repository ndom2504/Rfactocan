import { type Href, Link, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { Chip, ChipRow } from "@/components/chip";
import { Button, Card, ErrorText, Muted, Screen } from "@/components/ui";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { SHOP_CATEGORIES, shopCategoryLabel, type ShopCategoryId } from "@/lib/shops-catalog";
import { colors } from "@/lib/theme";

type Shop = {
  id: string;
  name: string;
  city?: string | null;
  country?: string | null;
  category?: string | null;
  user?: { displayName?: string | null };
  _count?: { products?: number };
};

export default function ShopsScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [category, setCategory] = useState<ShopCategoryId | "">("");
  const [shops, setShops] = useState<Shop[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const qs = category ? `?category=${encodeURIComponent(category)}` : "";
      const data = await api<{ shops: Shop[] }>(`/api/shops${qs}`);
      setShops(data.shops ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [category]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <Screen style={{ paddingBottom: 0 }}>
      <View style={{ marginBottom: 8, gap: 8 }}>
        <Button
          label={t("shops_create_title")}
          onPress={() => router.push("/shops/new" as Href)}
        />
        <Button
          label={t("my_projects_title")}
          variant="outline"
          onPress={() => router.push("/projects" as Href)}
        />
        <Button
          label={t("shops_orders")}
          variant="outline"
          onPress={() => router.push("/shops/orders")}
        />
      </View>
      <ChipRow>
        <Chip
          label={t("shops_all")}
          selected={category === ""}
          onPress={() => setCategory("")}
        />
        {SHOP_CATEGORIES.map((c) => (
          <Chip
            key={c.id}
            label={locale === "en" ? c.en : c.fr}
            selected={category === c.id}
            onPress={() => setCategory(c.id)}
          />
        ))}
      </ChipRow>
      <ErrorText>{error}</ErrorText>
      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={shops}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={load}
          ListEmptyComponent={<Muted>Aucune boutique ouverte.</Muted>}
          renderItem={({ item }) => (
            <Link href={`/shops/${item.id}`} asChild>
              <Pressable>
                <Card>
                  <Text style={{ fontWeight: "700", color: colors.foreground }}>
                    {item.name}
                  </Text>
                  <Muted>
                    {item.category
                      ? `${shopCategoryLabel(item.category, locale)} · `
                      : ""}
                    {[item.city, item.country].filter(Boolean).join(", ") || "—"}
                    {item._count?.products
                      ? ` · ${item._count.products} produit(s)`
                      : ""}
                  </Muted>
                  {item.user?.displayName ? (
                    <Muted>{item.user.displayName}</Muted>
                  ) : null}
                </Card>
              </Pressable>
            </Link>
          )}
        />
      )}
    </Screen>
  );
}
