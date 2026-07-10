import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  View,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatMoneyFromCents } from "@/lib/format";
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
import { colors } from "@/lib/theme";

type Message = {
  id: string;
  body: string | null;
  createdAt: string;
  senderId: string;
  sender?: { displayName: string };
};

type BookingPayload = {
  booking: {
    id: string;
    status: string;
    senderId: string;
    proposedBy?: string;
    request: {
      fromCity: string;
      toCity: string;
      weightKg: number;
      description: string;
    };
    trip: {
      userId: string;
      departAt: string;
      user: { id: string; displayName: string };
      currency?: string;
      pricePerKgCad?: number;
    };
    sender: { id: string; displayName: string };
    payment?: {
      status: string;
      amountCadCents: number;
      currency?: string;
    } | null;
  };
  paymentQuote?: {
    amountCents: number;
    currency: string;
  } | null;
};

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [data, setData] = useState<BookingPayload | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const [bookingData, msgData] = await Promise.all([
        api<BookingPayload>(`/api/bookings/${id}`),
        api<{ messages: Message[] }>(`/api/bookings/${id}/messages`),
      ]);
      setData(bookingData);
      setMessages(msgData.messages ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function sendMessage() {
    if (!id || !draft.trim()) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/bookings/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: draft.trim() }),
      });
      setDraft("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Envoi impossible");
    } finally {
      setBusy(false);
    }
  }

  async function patchStatus(status: string) {
    if (!id) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/bookings/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          goodsCertified: true,
          customsAcknowledged: true,
        }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action impossible");
    } finally {
      setBusy(false);
    }
  }

  async function pay() {
    if (!id) return;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ checkoutUrl: string }>(
        `/api/payments/${id}/checkout`,
        { method: "POST" }
      );
      if (result.checkoutUrl) {
        await WebBrowser.openBrowserAsync(result.checkoutUrl);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Paiement impossible");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !data) {
    return (
      <Screen>
        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <ErrorText>{error || "Réservation introuvable"}</ErrorText>
        )}
      </Screen>
    );
  }

  const booking = data.booking;
  const isSender = user?.id === booking.senderId;
  const isTraveler = user?.id === booking.trip.userId;
  const proposedByTraveler = booking.proposedBy === "TRAVELER";
  const canDecide =
    booking.status === "PROPOSED" &&
    (proposedByTraveler ? isSender : isTraveler);
  const amountLabel = data.paymentQuote
    ? formatMoneyFromCents(
        data.paymentQuote.amountCents,
        data.paymentQuote.currency
      )
    : booking.payment
      ? formatMoneyFromCents(
          booking.payment.amountCadCents,
          booking.payment.currency || "CAD"
        )
      : null;

  return (
    <Screen style={{ paddingBottom: 0 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={80}
      >
        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          ListHeaderComponent={
            <View>
              <Title>
                {booking.request.fromCity} → {booking.request.toCity}
              </Title>
              <Card>
                <Muted>{booking.request.weightKg} kg</Muted>
                <Muted>
                  {booking.sender.displayName} ↔{" "}
                  {booking.trip.user.displayName}
                </Muted>
                <Badge>{booking.status}</Badge>
                {amountLabel ? (
                  <Text
                    style={{
                      marginTop: 10,
                      fontSize: 20,
                      fontWeight: "700",
                      color: colors.foreground,
                    }}
                  >
                    {amountLabel}
                  </Text>
                ) : null}
              </Card>

              {canDecide ? (
                <View style={{ marginBottom: 12 }}>
                  <Button
                    label="Accepter"
                    onPress={() => patchStatus("ACCEPTED")}
                    loading={busy}
                  />
                  <Button
                    label="Refuser"
                    variant="danger"
                    onPress={() => patchStatus("REFUSED")}
                    disabled={busy}
                  />
                </View>
              ) : null}

              {booking.status === "AWAITING_PAYMENT" && isSender ? (
                <View style={{ marginBottom: 12 }}>
                  <Button
                    label="Payer avec Stripe"
                    onPress={pay}
                    loading={busy}
                  />
                  <Muted>
                    Le paiement s&apos;ouvre dans le navigateur (séquestre).
                  </Muted>
                </View>
              ) : null}

              <Text
                style={{
                  fontWeight: "700",
                  color: colors.foreground,
                  marginBottom: 8,
                }}
              >
                Messages
              </Text>
              <ErrorText>{error}</ErrorText>
            </View>
          }
          renderItem={({ item }) => (
            <Card>
              <Muted>
                {item.sender?.displayName ??
                  (item.senderId === user?.id ? "Vous" : "Participant")}
              </Muted>
              <Text style={{ color: colors.foreground, marginTop: 4 }}>
                {item.body}
              </Text>
            </Card>
          )}
          ListEmptyComponent={<Muted>Aucun message.</Muted>}
        />
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingTop: 8,
            paddingBottom: 12,
            backgroundColor: colors.background,
          }}
        >
          <Field
            label="Nouveau message"
            value={draft}
            onChangeText={setDraft}
            placeholder="Écrire…"
          />
          <Button
            label="Envoyer"
            onPress={sendMessage}
            loading={busy}
            disabled={!draft.trim()}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
