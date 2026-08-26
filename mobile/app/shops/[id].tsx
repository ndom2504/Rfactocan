import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text } from "react-native";
import { Card, ErrorText, Muted, Screen, Title } from "@/components/ui";
import { api } from "@/lib/api";
import { formatMoneyFromCents } from "@/lib/format";
import { colors } from "@/lib/theme";

type Product = {
  id: string;
  title: string;
  effectivePriceCents?: number;
  priceCents?: number;
};

type Shop = {
  name: string;
  city?: string | null;
  country?: string | null;
  currency?: string | null;
  description?: string | null;
  user?: { displayName?: string | null };
  products?: Product[];
};

export default function ShopDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [shop, setShop] = useState<Shop | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setError("");
    try {
      const data = await api<{ shop: Shop }>(`/api/shops/${id}`);
      setShop(data.shop);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
      </Screen>
    );
  }

  if (!shop) {
    return (
      <Screen>
        <ErrorText>{error || "Boutique introuvable"}</ErrorText>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView>
        <Title>{shop.name}</Title>
        <Muted>
          {[shop.city, shop.country].filter(Boolean).join(", ") || "—"}
          {shop.user?.displayName ? ` · ${shop.user.displayName}` : ""}
        </Muted>
        <ErrorText>{error}</ErrorText>
        {shop.description ? (
          <Card>
            <Text style={{ color: colors.foreground }}>{shop.description}</Text>
          </Card>
        ) : null}
        {(shop.products ?? []).map((p) => (
          <Card key={p.id}>
            <Text style={{ fontWeight: "700", color: colors.foreground }}>
              {p.title}
            </Text>
            <Muted>
              {formatMoneyFromCents(
                p.effectivePriceCents ?? p.priceCents ?? 0,
                shop.currency || "CAD"
              )}
            </Muted>
          </Card>
        ))}
        {!(shop.products ?? []).length ? (
          <Muted>Aucun produit actif.</Muted>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
