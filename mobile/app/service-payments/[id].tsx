import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Button, ErrorText, Muted, Screen, Title } from "@/components/ui";
import { api } from "@/lib/api";
import { formatMoneyFromCents } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import {
  isServiceOrderSettled,
  servicePaymentStatusKey,
  type ServicePayment,
} from "@/lib/service-payments";
import { useOptionalTheme } from "@/lib/theme-context";
import { colors as lightColors } from "@/lib/theme";

type PayAction =
  | "pay_card"
  | "pay_interac"
  | "client_mark_paid"
  | "provider_confirm"
  | "mark_delivered"
  | "confirm_delivery";

export default function ServicePaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const colors = useOptionalTheme()?.colors ?? lightColors;
  const [payment, setPayment] = useState<ServicePayment | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [interacReceiver, setInteracReceiver] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api<{
        payment?: ServicePayment;
        role?: string;
        interacReceiver?: string | null;
      }>(`/api/service-payments/${id}`);
      setPayment(data.payment ?? null);
      setRole(data.role ?? null);
      setInteracReceiver(data.interacReceiver ?? null);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  useEffect(() => {
    if (!id) return;
    if (isServiceOrderSettled(payment?.status, payment?.escrowUntilConfirm)) {
      return;
    }
    const tick = setInterval(() => {
      void load();
    }, 4000);
    return () => clearInterval(tick);
  }, [id, load, payment?.status, payment?.escrowUntilConfirm]);

  async function act(action: PayAction, extra?: Record<string, string>) {
    if (!id || busy) return;
    setBusy(true);
    setError("");
    try {
      const data = await api<{
        checkoutUrl?: string;
        url?: string;
        alreadyPaid?: boolean;
        payment?: ServicePayment;
      }>(`/api/service-payments/${id}/pay`, {
        method: "POST",
        body: JSON.stringify({ action, ...extra }),
      });
      const checkout = data.checkoutUrl || data.url;
      if (checkout) {
        await Linking.openURL(checkout);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      await load();
    } finally {
      setBusy(false);
    }
  }

  const isClient = role === "client";
  const isProvider = role === "provider";
  const receiver =
    payment?.receiverHint?.trim() || interacReceiver || null;
  const amountLabel = formatMoneyFromCents(
    payment?.amountCents ?? 0,
    payment?.currency || "CAD"
  );
  const escrow = payment?.escrowUntilConfirm === true;
  const processingDays = payment?.processingDays ?? 3;
  const payable = isClient && payment?.status === "AWAITING_PAYMENT";
  const awaitingSend =
    payment?.payMethod === "INTERAC" && payment.status === "AWAITING_PAYMENT";
  const awaitingConfirm =
    payment?.payMethod === "INTERAC" &&
    payment.status === "AWAITING_CONFIRMATION";
  const statusKey = servicePaymentStatusKey(
    payment?.status,
    isClient,
    payment?.escrowUntilConfirm
  );

  if (loading && !payment) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t("svc_pay_title") }} />
        <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: t("svc_pay_title") }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 32, gap: 12 }}>
        <ErrorText>{error}</ErrorText>
        <Title>{payment?.title || t("svc_pay_request")}</Title>
        <Text
          style={{
            color: colors.accent,
            fontSize: 18,
            fontWeight: "700",
          }}
        >
          {amountLabel}
        </Text>
        {statusKey ? (
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: colors.foreground,
            }}
          >
            {t(statusKey)}
          </Text>
        ) : null}
        <Muted>
          {t("svc_pay_processing_days")} : {processingDays}{" "}
          {processingDays <= 1 ? t("svc_pay_day") : t("svc_pay_days")}
        </Muted>
        {escrow &&
        payment?.payMethod !== "INTERAC" &&
        payment?.payMethod !== "MOBILE" ? (
          <Muted>
            {isClient
              ? t("svc_pay_escrow_hint_client")
              : t("svc_pay_escrow_hint_provider")}
          </Muted>
        ) : null}
        {payment?.description ? (
          <Text style={{ fontSize: 14, color: colors.foreground, lineHeight: 20 }}>
            {payment.description}
          </Text>
        ) : null}

        {payable &&
        payment?.payMethod !== "INTERAC" &&
        payment?.payMethod !== "MOBILE" ? (
          <View>
            <Button
              label={t("svc_pay_card")}
              onPress={() => void act("pay_card")}
              disabled={busy}
              loading={busy}
            />
            <Button
              label={t("svc_pay_interac")}
              variant="outline"
              onPress={() => void act("pay_interac", { payProvider: "interac" })}
              disabled={busy}
            />
          </View>
        ) : null}

        {payable && awaitingSend && receiver ? (
          <View style={{ gap: 8 }}>
            <Text
              selectable
              style={{ fontSize: 14, color: colors.foreground, lineHeight: 20 }}
            >
              {t("svc_pay_interac_step2")} {receiver}
            </Text>
            <Button
              label={t("svc_pay_mark_paid")}
              onPress={() => void act("client_mark_paid")}
              disabled={busy}
              loading={busy}
            />
          </View>
        ) : null}

        {isClient && awaitingConfirm ? (
          <Muted>{t("svc_pay_status_AWAITING_CONFIRMATION")}</Muted>
        ) : null}

        {isProvider && awaitingConfirm ? (
          <Button
            label={t("svc_pay_confirm_received")}
            onPress={() => void act("provider_confirm")}
            disabled={busy}
            loading={busy}
          />
        ) : null}

        {isProvider && payment?.status === "PAID" && escrow ? (
          <View>
            <Muted>{t("svc_pay_waiting_delivery")}</Muted>
            <Button
              label={t("svc_pay_mark_delivered")}
              onPress={() => void act("mark_delivered")}
              disabled={busy}
              loading={busy}
            />
          </View>
        ) : null}

        {isClient && payment?.status === "PAID" && escrow ? (
          <Muted>{t("svc_pay_waiting_delivery")}</Muted>
        ) : null}

        {isProvider && payment?.status === "DELIVERED" ? (
          <Muted>{t("svc_pay_waiting_confirm")}</Muted>
        ) : null}

        {isClient && payment?.status === "DELIVERED" ? (
          <Button
            label={t("svc_pay_confirm_delivery")}
            onPress={() => void act("confirm_delivery")}
            disabled={busy}
            loading={busy}
          />
        ) : null}

        {payment?.status === "FULFILLED" && payment.stripeTransferId ? (
          <Text style={{ fontWeight: "700", color: colors.accent }}>
            {t("svc_pay_released")}
          </Text>
        ) : null}

        {busy ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 8 }} />
        ) : null}
      </ScrollView>
    </Screen>
  );
}
