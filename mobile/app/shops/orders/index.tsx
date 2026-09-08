import { Link, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { Chip, ChipRow } from "@/components/chip";
import { Card, ErrorText, Muted, Screen, Title } from "@/components/ui";
import { api } from "@/lib/api";
import { formatMoneyFromCents } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { colors } from "@/lib/theme";

type Order = {
  id: string;
  status: string;
  amountCents: number;
  currency: string;
  quantity: number;
  product: { id: string; title: string };
  shop: { id: string; name: string };
};

export default function ShopOrdersScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const qs = role === "seller" ? "?role=seller" : "";
      const data = await api<{ orders?: Order[] }>(`/api/shops/orders${qs}`);
      setOrders(data.orders ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setLoading(false);
    }
  }, [role, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <Screen style={{ paddingBottom: 0 }}>
      <Title>{t("shops_orders")}</Title>
      <ChipRow>
        <Chip
          label={t("shops_orders")}
          selected={role === "buyer"}
          onPress={() => setRole("buyer")}
        />
        <Chip
          label={t("shops_seller_orders")}
          selected={role === "seller"}
          onPress={() => setRole("seller")}
        />
      </ChipRow>
      <ErrorText>{error}</ErrorText>
      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={load}
          ListEmptyComponent={<Muted>—</Muted>}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/shops/orders/${item.id}`)}>
              <Card>
                <Text style={{ fontWeight: "700", color: colors.foreground }}>
                  {item.product.title}
                </Text>
                <Muted>
                  {item.shop.name} · x{item.quantity} ·{" "}
                  {formatMoneyFromCents(item.amountCents, item.currency)}
                </Muted>
                <Muted>{item.status}</Muted>
              </Card>
            </Pressable>
          )}
        />
      )}
      <View style={{ paddingVertical: 8 }}>
        <Link href="/(tabs)/shops" asChild>
          <Pressable>
            <Muted>{t("browse_shops")}</Muted>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}
