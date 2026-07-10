"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookingChat } from "@/components/booking-chat";
import { BookingTracker } from "@/components/booking-tracker";
import { HandoverQrPanel } from "@/components/handover-qr";
import { DisputePanel } from "@/components/dispute-panel";
import { formatDate, formatKg } from "@/lib/utils";
import { useI18n } from "@/components/locale-provider";

type Payment = {
  id: string;
  status: string;
  amountCadCents: number;
  platformFeeCents: number;
  travelerPayoutCents: number;
  currency?: string;
};

type Booking = {
  id: string;
  status: string;
  senderId: string;
  proposedBy?: string;
  goodsCertified: boolean;
  customsAcknowledged: boolean;
  payment?: Payment | null;
  request: {
    fromCity: string;
    toCity: string;
    weightKg: number;
    description: string;
    photos: string[];
  };
  trip: {
    id: string;
    userId: string;
    departAt: string;
    fromCity: string;
    toCity: string;
    pricePerKgCad?: number;
    user: {
      id: string;
      displayName: string;
      kycStatus?: string;
      stripeConnectChargesEnabled?: boolean;
      stripeConnectPayoutsEnabled?: boolean;
    };
  };
  sender: { id: string; displayName: string };
  reviews: { fromUserId: string }[];
};

function formatCents(cents: number, currency = "CAD") {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function feePercentLabel(payment: Payment) {
  if (!payment.amountCadCents) return "—";
  const pct = Math.round(
    (payment.platformFeeCents / payment.amountCadCents) * 1000
  ) / 10;
  return `${pct} %`;
}

export default function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { t, bookingStatus, paymentStatus } = useI18n();
  const [id, setId] = useState("");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [meId, setMeId] = useState("");
  const [goodsCertified, setGoodsCertified] = useState(false);
  const [customsAcknowledged, setCustomsAcknowledged] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [stripeConfigured, setStripeConfigured] = useState(true);
  const [paymentReturn, setPaymentReturn] = useState<
    "success" | "cancel" | null
  >(null);

  useEffect(() => {
    void params.then((p) => setId(p.id));
    if (typeof window !== "undefined") {
      const q = new URLSearchParams(window.location.search).get("payment");
      if (q === "success" || q === "cancel") setPaymentReturn(q);
    }
  }, [params]);

  async function load() {
    if (!id) return;
    const [bRes, meRes] = await Promise.all([
      fetch(`/api/bookings/${id}`),
      fetch("/api/auth/me"),
    ]);
    const bData = await bRes.json();
    const meData = await meRes.json();
    if (bRes.ok) {
      setBooking(bData.booking);
      setStripeConfigured(bData.stripeConfigured !== false);
      if (
        paymentReturn === "success" &&
        bData.booking?.status === "ACCEPTED"
      ) {
        setMessage("Paiement confirmé — fonds sécurisés jusqu'à la livraison.");
        setPaymentReturn(null);
      }
    }
    if (meRes.ok) setMeId(meData.user?.id ?? "");
  }

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (paymentReturn === "success") {
      setMessage(
        "Paiement envoyé — confirmation en cours (quelques secondes)."
      );
      void load();
    } else if (paymentReturn === "cancel") {
      setError("Paiement annulé. Vous pouvez réessayer quand vous voulez.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentReturn, id]);

  async function patchStatus(status: string) {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        ...(status === "ACCEPTED"
          ? { goodsCertified, customsAcknowledged }
          : {}),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      if (data.code === "KYC_REQUIRED" || data.code === "CONNECT_REQUIRED") {
        setError(
          `${data.error ?? "Configuration requise."} → Profil`
        );
      } else {
        setError(data.error ?? "Erreur");
      }
      return;
    }
    await load();
    router.refresh();
  }

  async function startCheckout() {
    setLoading(true);
    setError("");
    setMessage("");
    const res = await fetch(`/api/payments/${id}/checkout`, { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      if (data.alreadyPaid) {
        setMessage("Paiement déjà sécurisé.");
        await load();
        return;
      }
      setError(data.error ?? "Paiement impossible");
      return;
    }
    window.location.href = data.checkoutUrl;
  }

  async function submitReview() {
    if (!booking) return;
    const toUserId =
      meId === booking.senderId ? booking.trip.user.id : booking.sender.id;
    const res = await fetch(`/api/bookings/${id}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, comment, toUserId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Erreur notation");
      return;
    }
    await load();
  }

  if (!booking) {
    return <p className="text-sm text-[var(--muted)]">{t("loading")}</p>;
  }

  const isTraveler = meId === booking.trip.userId;
  const isSender = meId === booking.senderId;
  const proposedByTraveler = booking.proposedBy === "TRAVELER";
  const canDecideProposal =
    booking.status === "PROPOSED" &&
    (proposedByTraveler ? isSender : isTraveler);
  const alreadyReviewed = booking.reviews.some((r) => r.fromUserId === meId);
  const payment = booking.payment;
  const paymentAuthorized =
    payment?.status === "AUTHORIZED" || payment?.status === "CAPTURED";
  const paymentFailed = payment?.status === "FAILED";
  const awaitingConfirm =
    paymentReturn === "success" && booking.status === "AWAITING_PAYMENT";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <Card>
          <CardTitle>
            {booking.request.fromCity} → {booking.request.toCity}
          </CardTitle>
          <CardDescription>
            {formatKg(booking.request.weightKg)} · {t("departure_date")}{" "}
            {formatDate(booking.trip.departAt)}
          </CardDescription>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>{bookingStatus(booking.status)}</Badge>
            {payment && (
              <Badge className="bg-[var(--accent-soft)] text-[var(--accent)]">
                {paymentStatus(payment.status)}
              </Badge>
            )}
            {booking.trip.user.kycStatus === "VERIFIED" && (
              <Badge className="bg-[var(--accent-soft)] text-[var(--accent)]">
                {t("traveler_verified")}
              </Badge>
            )}
          </div>
          <p className="mt-4 text-sm">{booking.request.description}</p>
          <p className="mt-3 text-sm text-[var(--muted)]">
            {t("sender")} : {booking.sender.displayName}
            <br />
            {t("traveler")} : {booking.trip.user.displayName}
          </p>
          {message && (
            <p className="mt-3 text-sm text-[var(--accent)]">{message}</p>
          )}
          {error && (
            <p className="mt-3 text-sm text-red-700">
              {error}{" "}
              {(error.includes("Profil") ||
                error.includes("identité") ||
                error.includes("gains")) && (
                <Link href="/profile" className="underline">
                  Ouvrir le profil
                </Link>
              )}
            </p>
          )}

          {booking.status === "PROPOSED" &&
            isTraveler &&
            proposedByTraveler && (
              <p className="mt-4 text-sm text-[var(--muted)]">
                {t("application_pending_traveler")}
              </p>
            )}

          {canDecideProposal && proposedByTraveler && isSender && (
            <div className="mt-4 space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <p className="text-sm text-[var(--muted)]">
                {t("accept_application_hint")}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={loading}
                  onClick={() => patchStatus("ACCEPTED")}
                >
                  {t("accept_application")}
                </Button>
                <Button
                  variant="danger"
                  disabled={loading}
                  onClick={() => patchStatus("REFUSED")}
                >
                  {t("refuse")}
                </Button>
              </div>
              <p className="text-xs text-[var(--muted)]">
                {t("liability_compact")}{" "}
                <Link href="/responsibility" className="underline">
                  {t("liability_learn_more")}
                </Link>
              </p>
            </div>
          )}

          {canDecideProposal && !proposedByTraveler && isTraveler && (
            <div className="mt-4 space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <p className="text-sm text-[var(--muted)]">{t("accept_hint")}</p>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={goodsCertified}
                  onChange={(e) => setGoodsCertified(e.target.checked)}
                  className="mt-1"
                />
                {t("goods_cert")}
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={customsAcknowledged}
                  onChange={(e) => setCustomsAcknowledged(e.target.checked)}
                  className="mt-1"
                />
                {t("customs_ack")}
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={loading || !goodsCertified || !customsAcknowledged}
                  onClick={() => patchStatus("ACCEPTED")}
                >
                  {t("accept_ask_payment")}
                </Button>
                <Button
                  variant="danger"
                  disabled={loading}
                  onClick={() => patchStatus("REFUSED")}
                >
                  {t("refuse")}
                </Button>
              </div>
              <p className="text-xs text-[var(--muted)]">
                {t("kyc_connect_hint")}{" "}
                <Link href="/profile" className="underline">
                  {t("nav_profile")}
                </Link>
              </p>
              <p className="text-xs text-[var(--muted)]">
                {t("liability_compact")}{" "}
                <Link href="/responsibility" className="underline">
                  {t("liability_learn_more")}
                </Link>
              </p>
            </div>
          )}

          {booking.status === "AWAITING_PAYMENT" && isSender && (
            <div className="mt-4 space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <h3 className="font-medium">{t("pay_secure")}</h3>
              {awaitingConfirm && (
                <p className="text-sm text-[var(--accent)]">
                  {t("payment_confirming")}
                </p>
              )}
              {paymentFailed && (
                <p className="text-sm text-red-700">
                  {t("payment_failed_hint")}
                </p>
              )}
              {payment && !paymentAuthorized && (
                <ul className="space-y-1 text-sm">
                  <li>
                    {t("total")} :{" "}
                    {formatCents(
                      payment.amountCadCents,
                      payment.currency ?? "CAD"
                    )}
                  </li>
                  <li>
                    {t("commission")} ({feePercentLabel(payment)}) :{" "}
                    {formatCents(
                      payment.platformFeeCents,
                      payment.currency ?? "CAD"
                    )}
                  </li>
                  <li>
                    {t("traveler_receives")} :{" "}
                    {formatCents(
                      payment.travelerPayoutCents,
                      payment.currency ?? "CAD"
                    )}
                  </li>
                </ul>
              )}
              {!payment && (
                <p className="text-sm text-[var(--muted)]">
                  {t("funds_held_until")}
                </p>
              )}
              {!awaitingConfirm && !paymentAuthorized && (
                <Button disabled={loading} onClick={startCheckout}>
                  {loading
                    ? t("loading")
                    : paymentFailed
                      ? t("retry_payment")
                      : t("pay_stripe")}
                </Button>
              )}
              {!stripeConfigured && (
                <p className="text-xs text-[var(--muted)]">
                  {t("stripe_demo")}
                </p>
              )}
            </div>
          )}

          {booking.status === "AWAITING_PAYMENT" && isTraveler && (
            <p className="mt-4 text-sm text-[var(--muted)]">
              {t("awaiting_sender_payment")}
            </p>
          )}

          {booking.status === "ACCEPTED" && (isSender || isTraveler) && (
            <HandoverQrPanel bookingId={id} onConfirmed={() => void load()} />
          )}

          {["ACCEPTED", "HANDED_OVER", "IN_TRANSIT"].includes(booking.status) &&
            (isSender || isTraveler) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {booking.status === "ACCEPTED" && (
                  <Button
                    variant="outline"
                    disabled={loading}
                    onClick={() => patchStatus("HANDED_OVER")}
                  >
                    {t("handover_manual")}
                  </Button>
                )}
                {booking.status === "HANDED_OVER" && (
                  <Button
                    disabled={loading}
                    onClick={() => patchStatus("IN_TRANSIT")}
                  >
                    {t("in_transit")}
                  </Button>
                )}
                {booking.status === "IN_TRANSIT" && (
                  <Button
                    disabled={loading}
                    onClick={() => patchStatus("DELIVERED")}
                  >
                    {t("mark_delivered")}
                  </Button>
                )}
                <Button
                  variant="outline"
                  disabled={loading}
                  onClick={() => patchStatus("CANCELLED")}
                >
                  {t("cancel")}
                </Button>
              </div>
            )}

          {booking.status === "DELIVERED" && !alreadyReviewed && (
            <div className="mt-4 space-y-3 border-t border-[var(--border)] pt-4">
              <h3 className="font-medium">{t("leave_review")}</h3>
              <div className="space-y-2">
                <Label>{t("rating")}</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                />
              </div>
              <Textarea
                placeholder={t("comment")}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <Button onClick={submitReview}>{t("send_review")}</Button>
            </div>
          )}
          {alreadyReviewed && (
            <p className="mt-4 text-sm text-[var(--accent)]">
              {t("review_thanks")}
            </p>
          )}
        </Card>
        <Link href="/bookings" className="text-sm text-[var(--muted)] underline">
          {t("back_bookings")}
        </Link>
        {(isSender || isTraveler) &&
          [
            "ACCEPTED",
            "HANDED_OVER",
            "IN_TRANSIT",
            "DELIVERED",
            "CANCELLED",
          ].includes(booking.status) && (
            <DisputePanel
              bookingId={id}
              canOpen={!["REFUSED", "PROPOSED", "AWAITING_PAYMENT"].includes(
                booking.status
              )}
            />
          )}
        <BookingTracker bookingId={id} />
      </div>

      <BookingChat
        bookingId={id}
        meId={meId}
        closed={["CANCELLED", "REFUSED"].includes(booking.status)}
      />
    </div>
  );
}
