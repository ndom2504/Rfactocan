"use client";

import { useEffect, useState } from "react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BOOKING_STATUS_LABELS,
  KYC_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/corridors";
import { formatDate } from "@/lib/utils";
import { formatMoneyFromCents } from "@/lib/currency";

type AdminData = {
  stats: {
    users: number;
    trips: number;
    requests: number;
    delivered: number;
    openReports: number;
    openDisputes: number;
    paymentsCaptured: number;
    kycVerified: number;
    platformFeesCadCents: number;
    volumeCadCents: number;
  };
  users: Array<{
    id: string;
    email: string;
    displayName: string;
    role: string;
    status: string;
    verifiedAt: string | null;
    kycStatus: string;
    stripeConnectChargesEnabled: boolean;
    ratingAvg: number;
    createdAt: string;
  }>;
  openReports: Array<{
    id: string;
    reason: string;
    details: string | null;
    createdAt: string;
    reporter: { displayName: string; email: string };
    targetUser: { id: string; displayName: string; email: string };
  }>;
  openDisputes: Array<{
    id: string;
    reason: string;
    details: string | null;
    status: string;
    adminNote: string | null;
    createdAt: string;
    openedBy: { displayName: string; email: string };
    againstUser: { id: string; displayName: string; email: string };
    booking: {
      id: string;
      status: string;
      request: { fromCity: string; toCity: string };
    };
  }>;
  payments: Array<{
    id: string;
    status: string;
    amountCadCents: number;
    platformFeeCents: number;
    travelerPayoutCents: number;
    currency?: string;
    createdAt: string;
    booking: {
      id: string;
      status: string;
      paymentExpiresAt?: string | null;
      cancelledReason?: string | null;
      sender: { displayName: string };
      trip: { fromCity: string; toCity: string; user: { displayName: string } };
    };
  }>;
  pendingOffers: Array<{
    id: string;
    status: string;
    paymentExpiresAt: string | null;
    updatedAt: string;
    sender: { displayName: string; email: string };
    request: {
      fromCity: string;
      toCity: string;
      weightKg: number;
      status: string;
    };
    trip: {
      fromCity: string;
      toCity: string;
      user: { displayName: string; email: string };
    };
    payment: {
      status: string;
      amountCadCents: number;
      currency?: string;
    } | null;
  }>;
};

function remainingLabel(expiresAt: string | null) {
  if (!expiresAt) return "—";
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Expiré";
  const h = Math.floor(ms / (60 * 60 * 1000));
  const m = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return `${h}h ${m}m`;
}

function formatCents(cents: number, currency = "CAD") {
  return formatMoneyFromCents(cents, currency, "fr-CA");
}

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/admin");
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Accès refusé");
      return;
    }
    setData(json);
  }

  useEffect(() => {
    void load();
  }, []);

  async function action(userId: string, actionName: string) {
    await fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action: actionName }),
    });
    await load();
  }

  async function cancelBooking(bookingId: string) {
    if (
      !confirm(
        "Annuler cette offre pour non-respect de la charte ? Les parties seront notifiées."
      )
    ) {
      return;
    }
    await fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "cancel_booking",
        bookingId,
        reason: "ADMIN_CHARTER",
      }),
    });
    await load();
  }

  async function resolveReport(reportId: string) {
    await fetch("/api/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId, resolved: true }),
    });
    await load();
  }

  async function updateDispute(
    disputeId: string,
    status: "IN_REVIEW" | "RESOLVED" | "CLOSED"
  ) {
    await fetch("/api/disputes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disputeId, status }),
    });
    await load();
  }

  if (error) {
    return <p className="text-sm text-red-700">{error}</p>;
  }
  if (!data) {
    return <p className="text-sm text-[var(--muted)]">Chargement...</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          Administration
        </h1>
        <p className="text-[var(--muted)]">
          KYC, paiements escrow, suspensions et litiges.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Utilisateurs", data.stats.users],
          ["KYC vérifiés", data.stats.kycVerified],
          ["Paiements capturés", data.stats.paymentsCaptured],
          ["Frais plateforme", formatCents(data.stats.platformFeesCadCents)],
          ["Volume", formatCents(data.stats.volumeCadCents)],
          ["Livrés", data.stats.delivered],
          ["Voyages", data.stats.trips],
          ["Signalements", data.stats.openReports],
          ["Litiges ouverts", data.stats.openDisputes ?? 0],
          ["Offres en attente", data.pendingOffers?.length ?? 0],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <CardDescription>{label}</CardDescription>
            <CardTitle className="mt-2 text-2xl">{value}</CardTitle>
          </Card>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Offres / paiements en attente
        </h2>
        {(data.pendingOffers ?? []).length === 0 && (
          <p className="text-sm text-[var(--muted)]">
            Aucune offre proposée ou en attente de paiement.
          </p>
        )}
        {(data.pendingOffers ?? []).map((b) => (
          <Card key={b.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">
                  {b.request.fromCity} → {b.request.toCity}
                </CardTitle>
                <CardDescription>
                  {b.sender.displayName} ↔ {b.trip.user.displayName} ·{" "}
                  {b.request.weightKg} kg
                  {b.payment
                    ? ` · ${formatCents(b.payment.amountCadCents, b.payment.currency)}`
                    : ""}
                </CardDescription>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge>
                    {BOOKING_STATUS_LABELS[b.status] ?? b.status}
                  </Badge>
                  {b.payment && (
                    <Badge>
                      {PAYMENT_STATUS_LABELS[b.payment.status] ??
                        b.payment.status}
                    </Badge>
                  )}
                  {b.status === "AWAITING_PAYMENT" && (
                    <Badge>
                      Paiement : {remainingLabel(b.paymentExpiresAt)}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={`/bookings/${b.id}`}>
                  <Button size="sm" variant="outline">
                    Voir
                  </Button>
                </a>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => cancelBooking(b.id)}
                >
                  Annuler (charte)
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Paiements récents
        </h2>
        {data.payments.length === 0 && (
          <p className="text-sm text-[var(--muted)]">Aucun paiement.</p>
        )}
        {data.payments.map((p) => (
          <Card key={p.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">
                  {p.booking.trip.fromCity} → {p.booking.trip.toCity}
                </CardTitle>
                <CardDescription>
                  {p.booking.sender.displayName} →{" "}
                  {p.booking.trip.user.displayName} ·{" "}
                  {formatCents(p.amountCadCents, p.currency)} · frais{" "}
                  {formatCents(p.platformFeeCents, p.currency)}
                </CardDescription>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge>
                    {PAYMENT_STATUS_LABELS[p.status] ?? p.status}
                  </Badge>
                  <Badge>
                    Booking:{" "}
                    {BOOKING_STATUS_LABELS[p.booking.status] ?? p.booking.status}
                  </Badge>
                </div>
              </div>
              <span className="text-xs text-[var(--muted)]">
                {formatDate(p.createdAt)}
              </span>
            </div>
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Utilisateurs
        </h2>
        {data.users.map((u) => (
          <Card key={u.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">{u.displayName}</CardTitle>
                <CardDescription>
                  {u.email} · {u.role} · inscrit {formatDate(u.createdAt)}
                </CardDescription>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge>{u.status}</Badge>
                  <Badge>
                    KYC: {KYC_STATUS_LABELS[u.kycStatus] ?? u.kycStatus}
                  </Badge>
                  {u.stripeConnectChargesEnabled && (
                    <Badge className="bg-[var(--accent-soft)] text-[var(--accent)]">
                      Connect OK
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {u.kycStatus !== "VERIFIED" && (
                  <Button
                    size="sm"
                    onClick={() => action(u.id, "mark_kyc_verified")}
                  >
                    Forcer KYC
                  </Button>
                )}
                {u.status !== "SUSPENDED" ? (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => action(u.id, "suspend")}
                  >
                    Suspendre
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => action(u.id, "activate")}
                  >
                    Réactiver
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Litiges ouverts
        </h2>
        {(data.openDisputes ?? []).length === 0 && (
          <p className="text-sm text-[var(--muted)]">Aucun litige ouvert.</p>
        )}
        {(data.openDisputes ?? []).map((d) => (
          <Card key={d.id}>
            <CardTitle className="text-base">
              {d.booking.request.fromCity} → {d.booking.request.toCity} ·{" "}
              {d.reason}
            </CardTitle>
            <CardDescription>
              {d.openedBy.displayName} vs {d.againstUser.displayName} ·{" "}
              {d.status}
              {d.details ? ` — ${d.details}` : ""}
            </CardDescription>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={`/bookings/${d.booking.id}`}>
                <Button size="sm" variant="outline">
                  Voir réservation
                </Button>
              </a>
              {d.status === "OPEN" && (
                <Button
                  size="sm"
                  onClick={() => updateDispute(d.id, "IN_REVIEW")}
                >
                  Prendre en charge
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => updateDispute(d.id, "RESOLVED")}
              >
                Résoudre
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateDispute(d.id, "CLOSED")}
              >
                Fermer
              </Button>
            </div>
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Signalements ouverts
        </h2>
        {data.openReports.length === 0 && (
          <p className="text-sm text-[var(--muted)]">Aucun signalement.</p>
        )}
        {data.openReports.map((r) => (
          <Card key={r.id}>
            <CardTitle className="text-base">
              {r.targetUser.displayName} signalé par {r.reporter.displayName}
            </CardTitle>
            <CardDescription>
              {r.reason}
              {r.details ? ` — ${r.details}` : ""}
            </CardDescription>
            <div className="mt-3">
              <Button size="sm" onClick={() => resolveReport(r.id)}>
                Marquer résolu
              </Button>
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
