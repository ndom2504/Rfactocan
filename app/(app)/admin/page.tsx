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

type AdminData = {
  stats: {
    users: number;
    trips: number;
    requests: number;
    delivered: number;
    openReports: number;
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
  payments: Array<{
    id: string;
    status: string;
    amountCadCents: number;
    platformFeeCents: number;
    travelerPayoutCents: number;
    createdAt: string;
    booking: {
      id: string;
      status: string;
      sender: { displayName: string };
      trip: { fromCity: string; toCity: string; user: { displayName: string } };
    };
  }>;
};

function formatCents(cents: number) {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
  }).format(cents / 100);
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

  async function resolveReport(reportId: string) {
    await fetch("/api/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId, resolved: true }),
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
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <CardDescription>{label}</CardDescription>
            <CardTitle className="mt-2 text-2xl">{value}</CardTitle>
          </Card>
        ))}
      </div>

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
                  {formatCents(p.amountCadCents)} · frais{" "}
                  {formatCents(p.platformFeeCents)}
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
