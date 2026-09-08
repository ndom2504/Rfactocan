import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  View,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Chip, ChipRow } from "@/components/chip";
import { DisputePanel } from "@/components/dispute-panel";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatMoneyFromCents } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useKeyboardLift } from "@/lib/use-keyboard-lift";
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
    paymentExpiresAt?: string | null;
    cancelledReason?: string | null;
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
    reviews?: { fromUserId: string }[];
  };
  paymentQuote?: {
    amountCents: number;
    currency: string;
  } | null;
};

type Tracking = {
  steps?: string[];
  stepIndex?: number;
  events?: { id: string; label: string; createdAt: string }[];
};

type Handover = {
  canGenerate?: boolean;
  canConfirmCode?: boolean;
  code?: string | null;
  qrDataUrl?: string | null;
  expiresAt?: string | null;
};

function remainingLabel(expiresAt: string | null | undefined) {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Expiré";
  const h = Math.floor(ms / (60 * 60 * 1000));
  const m = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return `${h}h ${m}m restantes`;
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { t } = useI18n();
  const keyboardLift = useKeyboardLift();
  const [data, setData] = useState<BookingPayload | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [handover, setHandover] = useState<Handover | null>(null);
  const [draft, setDraft] = useState("");
  const [handoverCode, setHandoverCode] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!id) return;
    if (!opts?.silent) setLoading(true);
    setError("");
    try {
      const [bookingData, msgData, trackingData, handoverData] = await Promise.all([
        api<BookingPayload>(`/api/bookings/${id}`),
        api<{ messages: Message[] }>(`/api/bookings/${id}/messages`),
        api<Tracking>(`/api/bookings/${id}/tracking`).catch(() => null),
        api<Handover>(`/api/bookings/${id}/handover`).catch(() => null),
      ]);
      setData(bookingData);
      setMessages(msgData.messages ?? []);
      setTracking(trackingData);
      setHandover(handoverData);
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
      await load({ silent: true });
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
      await load({ silent: true });
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
      await load({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Paiement impossible");
    } finally {
      setBusy(false);
    }
  }

  async function generateHandover() {
    if (!id) return;
    setBusy(true);
    setError("");
    try {
      await api<Handover>(`/api/bookings/${id}/handover`, {
        method: "POST",
        body: JSON.stringify({ action: "generate" }),
      });
      await load({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setBusy(false);
    }
  }

  async function confirmHandoverCode() {
    if (!id || !handoverCode.trim()) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/bookings/${id}/handover`, {
        method: "POST",
        body: JSON.stringify({
          action: "confirm_code",
          code: handoverCode.trim(),
        }),
      });
      setHandoverCode("");
      await load({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setBusy(false);
    }
  }

  async function submitReview() {
    if (!id || !data) return;
    const toUserId =
      user?.id === data.booking.senderId
        ? data.booking.trip.user.id
        : data.booking.sender.id;
    setBusy(true);
    setError("");
    try {
      await api(`/api/bookings/${id}/reviews`, {
        method: "POST",
        body: JSON.stringify({
          rating,
          comment: comment.trim() || undefined,
          toUserId,
        }),
      });
      setComment("");
      await load({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
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
  const alreadyReviewed = (booking.reviews ?? []).some(
    (r) => r.fromUserId === user?.id
  );
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
  const paymentExpired =
    booking.status === "AWAITING_PAYMENT" &&
    !!booking.paymentExpiresAt &&
    new Date(booking.paymentExpiresAt).getTime() <= Date.now();
  const deadlineLabel = remainingLabel(booking.paymentExpiresAt);
  const cancelledMsg =
    booking.status === "CANCELLED" && booking.cancelledReason
      ? booking.cancelledReason === "PAYMENT_TIMEOUT"
        ? "Délai de paiement de 24h dépassé."
        : booking.cancelledReason === "SUPERSEDED_BY_PAYMENT"
          ? "Une autre offre a été payée en premier."
          : booking.cancelledReason === "ADMIN_CHARTER"
            ? "Offre annulée par l'admin (charte)."
            : "Offre annulée."
      : null;
  const lifecycle =
    ["ACCEPTED", "HANDED_OVER", "IN_TRANSIT"].includes(booking.status) &&
    (isSender || isTraveler);
  const canGenerateHandover =
    booking.status === "ACCEPTED" && (isSender || isTraveler);
  const canConfirmHandover = booking.status === "ACCEPTED" && isTraveler;

  return (
    <Screen style={{ paddingBottom: 0 }}>
      <View style={{ flex: 1 }}>
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

              {tracking?.steps?.length ? (
                <Card>
                  <Text
                    style={{
                      fontWeight: "700",
                      color: colors.foreground,
                      marginBottom: 8,
                    }}
                  >
                    {t("booking_tracking")}
                  </Text>
                  {(tracking.steps ?? []).map((step, i) => (
                    <Muted key={step}>
                      {i === tracking.stepIndex ? "● " : "○ "}
                      {step}
                    </Muted>
                  ))}
                  {(tracking.events ?? []).slice(-4).map((event) => (
                    <Muted key={event.id}>{event.label}</Muted>
                  ))}
                </Card>
              ) : null}

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
                  {deadlineLabel ? (
                    <Muted>
                      {paymentExpired
                        ? "Délai de paiement expiré."
                        : `Paiement sous 24h · ${deadlineLabel}`}
                    </Muted>
                  ) : null}
                  {!paymentExpired ? (
                    <Button
                      label="Payer avec Stripe"
                      onPress={pay}
                      loading={busy}
                    />
                  ) : null}
                  {!paymentExpired ? (
                    <Muted>
                      Le paiement s&apos;ouvre dans le navigateur (séquestre).
                    </Muted>
                  ) : null}
                </View>
              ) : null}

              {cancelledMsg ? (
                <ErrorText>{cancelledMsg}</ErrorText>
              ) : null}

              {booking.status === "ACCEPTED" && (isSender || isTraveler) ? (
                <Card>
                  <Text
                    style={{
                      fontWeight: "700",
                      color: colors.foreground,
                      marginBottom: 8,
                    }}
                  >
                    {t("booking_handover")}
                  </Text>
                  {handover?.qrDataUrl ? (
                    <Image
                      source={{ uri: handover.qrDataUrl }}
                      style={{
                        width: 220,
                        height: 220,
                        alignSelf: "center",
                        marginBottom: 8,
                      }}
                    />
                  ) : null}
                  {handover?.code ? (
                    <Text
                      style={{
                        textAlign: "center",
                        fontSize: 22,
                        fontWeight: "800",
                        letterSpacing: 3,
                        color: colors.foreground,
                        marginBottom: 8,
                      }}
                    >
                      {handover.code}
                    </Text>
                  ) : null}
                  {canGenerateHandover ? (
                    <Button
                      label={t("booking_generate_qr")}
                      variant="outline"
                      onPress={() => void generateHandover()}
                      loading={busy}
                    />
                  ) : null}
                  {canConfirmHandover ? (
                    <>
                      <Field
                        label={t("booking_handover_code")}
                        value={handoverCode}
                        onChangeText={setHandoverCode}
                        autoCapitalize="characters"
                      />
                      <Button
                        label={t("booking_confirm_code")}
                        onPress={() => void confirmHandoverCode()}
                        loading={busy}
                        disabled={!handoverCode.trim()}
                      />
                    </>
                  ) : null}
                </Card>
              ) : null}

              {lifecycle ? (
                <View style={{ marginBottom: 12 }}>
                  {booking.status === "ACCEPTED" ? (
                    <Button
                      label={t("booking_handover")}
                      variant="outline"
                      onPress={() => patchStatus("HANDED_OVER")}
                      disabled={busy}
                    />
                  ) : null}
                  {booking.status === "HANDED_OVER" ? (
                    <Button
                      label={t("booking_in_transit")}
                      onPress={() => patchStatus("IN_TRANSIT")}
                      loading={busy}
                    />
                  ) : null}
                  {booking.status === "IN_TRANSIT" ? (
                    <Button
                      label={t("booking_delivered")}
                      onPress={() => patchStatus("DELIVERED")}
                      loading={busy}
                    />
                  ) : null}
                </View>
              ) : null}

              {booking.status === "DELIVERED" && !alreadyReviewed ? (
                <Card>
                  <Text
                    style={{
                      fontWeight: "700",
                      color: colors.foreground,
                      marginBottom: 8,
                    }}
                  >
                    {t("booking_review")}
                  </Text>
                  <Muted>{t("booking_rating")}</Muted>
                  <ChipRow>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Chip
                        key={n}
                        label={String(n)}
                        selected={rating === n}
                        onPress={() => setRating(n)}
                      />
                    ))}
                  </ChipRow>
                  <Field
                    label={t("booking_comment")}
                    value={comment}
                    onChangeText={setComment}
                    multiline
                  />
                  <Button
                    label={t("booking_send_review")}
                    onPress={() => void submitReview()}
                    loading={busy}
                  />
                </Card>
              ) : null}
              {alreadyReviewed ? (
                <Muted>{t("booking_review_thanks")}</Muted>
              ) : null}

              {(isSender || isTraveler) &&
              !["REFUSED", "PROPOSED", "AWAITING_PAYMENT"].includes(
                booking.status
              ) ? (
                <DisputePanel
                  bookingId={booking.id}
                  canOpen={![
                    "REFUSED",
                    "PROPOSED",
                    "AWAITING_PAYMENT",
                  ].includes(booking.status)}
                />
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
            paddingBottom: 12 + keyboardLift,
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
      </View>
    </Screen>
  );
}
