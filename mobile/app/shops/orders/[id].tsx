import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, Text } from "react-native";
import { Badge, Button, Card, ErrorText, Muted, Screen, Title } from "@/components/ui";
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
  buyer?: { displayName?: string | null };
};

export default function ShopOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [isSeller, setIsSeller] = useState(false);
  const [isBuyer, setIsBuyer] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setError("");
    try {
      const data = await api<{
        order: Order;
        isSeller?: boolean;
        isBuyer?: boolean;
      }>(`/api/shops/orders/${id}`);
      setOrder(data.order);
      setIsSeller(Boolean(data.isSeller));
      setIsBuyer(Boolean(data.isBuyer));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function act(action: "fulfill" | "cancel" | "sync_paid") {
    if (!id) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/shops/orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
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

  if (!order) {
    return (
      <Screen>
        <ErrorText>{error}</ErrorText>
        <Button label={t("shops_orders")} onPress={() => router.push("/shops/orders")} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView>
        <Title>{order.product.title}</Title>
        <Muted>{order.shop.name}</Muted>
        <Card>
          <Badge>{order.status}</Badge>
          <Text
            style={{
              marginTop: 10,
              fontSize: 20,
              fontWeight: "800",
              color: colors.foreground,
            }}
          >
            {formatMoneyFromCents(order.amountCents, order.currency)} · x
            {order.quantity}
          </Text>
          {order.buyer?.displayName ? (
            <Muted>{order.buyer.displayName}</Muted>
          ) : null}
        </Card>
        <ErrorText>{error}</ErrorText>
        {order.status === "AWAITING_PAYMENT" ? (
          <>
            <Button
              label="Vérifier le paiement"
              onPress={() => void act("sync_paid")}
              loading={busy}
            />
            {(isBuyer || isSeller) && (
              <Button
                label={t("shop_cancel_order")}
                variant="danger"
                onPress={() => void act("cancel")}
                disabled={busy}
              />
            )}
          </>
        ) : null}
        {isSeller && order.status === "PAID" ? (
          <Button
            label={t("shop_fulfill")}
            onPress={() => void act("fulfill")}
            loading={busy}
          />
        ) : null}
        <Button
          label={t("shops_orders")}
          variant="outline"
          onPress={() => router.push("/shops/orders")}
        />
      </ScrollView>
    </Screen>
  );
}
