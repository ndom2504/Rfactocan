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
import {
  BOOKING_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/corridors";
import { formatDate, formatKg } from "@/lib/utils";

type Payment = {
  id: string;
  status: string;
  amountCadCents: number;
  platformFeeCents: number;
  travelerPayoutCents: number;
};

type Booking = {
  id: string;
  status: string;
  senderId: string;
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
    };
  };
  sender: { id: string; displayName: string };
  reviews: { fromUserId: string }[];
};

type Message = {
  id: string;
  body: string;
  attachmentUrl: string | null;
  createdAt: string;
  senderId: string;
  sender: { displayName: string };
};

function formatCents(cents: number) {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
  }).format(cents / 100);
}

export default function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [id, setId] = useState("");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [meId, setMeId] = useState("");
  const [body, setBody] = useState("");
  const [goodsCertified, setGoodsCertified] = useState(false);
  const [customsAcknowledged, setCustomsAcknowledged] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void params.then((p) => setId(p.id));
  }, [params]);

  async function load() {
    if (!id) return;
    const [bRes, mRes, meRes] = await Promise.all([
      fetch(`/api/bookings/${id}`),
      fetch(`/api/bookings/${id}/messages`),
      fetch("/api/auth/me"),
    ]);
    const bData = await bRes.json();
    const mData = await mRes.json();
    const meData = await meRes.json();
    if (bRes.ok) setBooking(bData.booking);
    if (mRes.ok) setMessages(mData.messages ?? []);
    if (meRes.ok) setMeId(meData.user?.id ?? "");
  }

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
      setError(data.error ?? "Erreur");
      return;
    }
    await load();
    router.refresh();
  }

  async function startCheckout() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/payments/${id}/checkout`, { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Paiement impossible");
      return;
    }
    window.location.href = data.checkoutUrl;
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    const res = await fetch(`/api/bookings/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (res.ok) {
      setBody("");
      await load();
    }
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
    return <p className="text-sm text-[var(--muted)]">Chargement...</p>;
  }

  const isTraveler = meId === booking.trip.userId;
  const isSender = meId === booking.senderId;
  const alreadyReviewed = booking.reviews.some((r) => r.fromUserId === meId);
  const payment = booking.payment;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <Card>
          <CardTitle>
            {booking.request.fromCity} → {booking.request.toCity}
          </CardTitle>
          <CardDescription>
            {formatKg(booking.request.weightKg)} · départ{" "}
            {formatDate(booking.trip.departAt)}
          </CardDescription>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>{BOOKING_STATUS_LABELS[booking.status] ?? booking.status}</Badge>
            {payment && (
              <Badge className="bg-[var(--accent-soft)] text-[var(--accent)]">
                {PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
              </Badge>
            )}
            {booking.trip.user.kycStatus === "VERIFIED" && (
              <Badge className="bg-[var(--accent-soft)] text-[var(--accent)]">
                Voyageur vérifié
              </Badge>
            )}
          </div>
          <p className="mt-4 text-sm">{booking.request.description}</p>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Expéditeur : {booking.sender.displayName}
            <br />
            Voyageur : {booking.trip.user.displayName}
          </p>
          {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

          {booking.status === "PROPOSED" && isTraveler && (
            <div className="mt-4 space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <p className="text-sm text-[var(--muted)]">
                Après acceptation, l&apos;expéditeur paiera en séquestre. Les
                fonds ne vous seront versés qu&apos;après confirmation de
                livraison.
              </p>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={goodsCertified}
                  onChange={(e) => setGoodsCertified(e.target.checked)}
                  className="mt-1"
                />
                Je confirme avoir inspecté le contenu du colis et n&apos;accepter
                que des biens conformes.
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={customsAcknowledged}
                  onChange={(e) => setCustomsAcknowledged(e.target.checked)}
                  className="mt-1"
                />
                Je respecte les lois douanières des pays de départ, transit et
                arrivée.
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={loading || !goodsCertified || !customsAcknowledged}
                  onClick={() => patchStatus("ACCEPTED")}
                >
                  Accepter (demander paiement)
                </Button>
                <Button
                  variant="danger"
                  disabled={loading}
                  onClick={() => patchStatus("REFUSED")}
                >
                  Refuser
                </Button>
              </div>
              <p className="text-xs text-[var(--muted)]">
                KYC + Stripe Connect requis. Configurez-les dans{" "}
                <Link href="/profile" className="underline">
                  Profil
                </Link>
                .
              </p>
            </div>
          )}

          {booking.status === "AWAITING_PAYMENT" && isSender && (
            <div className="mt-4 space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <h3 className="font-medium">Payer et sécuriser le colis</h3>
              {payment ? (
                <ul className="space-y-1 text-sm">
                  <li>Total : {formatCents(payment.amountCadCents)}</li>
                  <li>
                    Commission Rfacto (10 %) :{" "}
                    {formatCents(payment.platformFeeCents)}
                  </li>
                  <li>
                    Voyageur recevra : {formatCents(payment.travelerPayoutCents)}
                  </li>
                </ul>
              ) : (
                <p className="text-sm text-[var(--muted)]">
                  Les fonds seront bloqués jusqu&apos;à la confirmation de
                  livraison.
                </p>
              )}
              <Button disabled={loading} onClick={startCheckout}>
                {loading ? "Redirection..." : "Payer avec Stripe"}
              </Button>
            </div>
          )}

          {booking.status === "AWAITING_PAYMENT" && isTraveler && (
            <p className="mt-4 text-sm text-[var(--muted)]">
              En attente du paiement sécurisé de l&apos;expéditeur.
            </p>
          )}

          {["ACCEPTED", "HANDED_OVER", "IN_TRANSIT"].includes(booking.status) &&
            (isSender || isTraveler) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {booking.status === "ACCEPTED" && (
                  <Button
                    disabled={loading}
                    onClick={() => patchStatus("HANDED_OVER")}
                  >
                    Colis remis
                  </Button>
                )}
                {booking.status === "HANDED_OVER" && (
                  <Button
                    disabled={loading}
                    onClick={() => patchStatus("IN_TRANSIT")}
                  >
                    En transit
                  </Button>
                )}
                {booking.status === "IN_TRANSIT" && (
                  <Button
                    disabled={loading}
                    onClick={() => patchStatus("DELIVERED")}
                  >
                    Marquer livré (libère le paiement)
                  </Button>
                )}
                <Button
                  variant="outline"
                  disabled={loading}
                  onClick={() => patchStatus("CANCELLED")}
                >
                  Annuler
                </Button>
              </div>
            )}

          {booking.status === "DELIVERED" && !alreadyReviewed && (
            <div className="mt-4 space-y-3 border-t border-[var(--border)] pt-4">
              <h3 className="font-medium">Noter l&apos;autre partie</h3>
              <div className="space-y-2">
                <Label>Note</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                />
              </div>
              <Textarea
                placeholder="Commentaire"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <Button onClick={submitReview}>Envoyer l&apos;avis</Button>
            </div>
          )}
          {alreadyReviewed && (
            <p className="mt-4 text-sm text-[var(--accent)]">
              Merci, votre avis a été enregistré.
            </p>
          )}
        </Card>
        <Link href="/bookings" className="text-sm text-[var(--muted)] underline">
          Retour aux réservations
        </Link>
      </div>

      <Card className="flex min-h-[420px] flex-col">
        <CardTitle>Messagerie</CardTitle>
        <CardDescription>Discussion liée à cette réservation</CardDescription>
        <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                m.senderId === meId
                  ? "ml-auto bg-[var(--accent)] text-white"
                  : "bg-[var(--surface-2)]"
              }`}
            >
              <p className="text-xs opacity-70">{m.sender.displayName}</p>
              <p>{m.body}</p>
            </div>
          ))}
          {messages.length === 0 && (
            <p className="text-sm text-[var(--muted)]">
              Aucun message. Présentez-vous et négociez les détails.
            </p>
          )}
        </div>
        <form onSubmit={sendMessage} className="mt-4 flex gap-2">
          <Input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Votre message..."
          />
          <Button type="submit">Envoyer</Button>
        </form>
      </Card>
    </div>
  );
}
