"use client";

import { useEffect, useState, type FormEvent } from "react";
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
import { categoryLabel } from "@/lib/services-catalog";

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
    services?: number;
    servicesOpen?: number;
    servicesClosed?: number;
    serviceProviders?: number;
    servicesByCategory?: Array<{ category: string; count: number }>;
    shopsOpen?: number;
    shopOrdersPaid?: number;
    meetProfilesTotal?: number;
    meetProfilesActive?: number;
    meetBusiness?: number;
    meetRomance?: number;
    meetContactsPending?: number;
    meetContactsAccepted?: number;
  };
  users: Array<{
    id: string;
    email: string;
    displayName: string;
    role: string;
    status: string;
    verifiedAt: string | null;
    kycStatus: string;
    hasManualIdDoc?: boolean;
    manualIdDocStatus?: string;
    manualIdDocUploadedAt?: string | null;
    manualIdDocNote?: string | null;
    stripeConnectChargesEnabled: boolean;
    ratingAvg: number;
    createdAt: string;
    isAmbassador?: boolean;
    agentCode?: string | null;
    ambassadorRequestStatus?: string;
    ambassadorWhatsapp?: string | null;
    ambassadorRequestedAt?: string | null;
    _count?: { referrals: number };
  }>;
  pendingManualIds?: Array<{
    id: string;
    email: string;
    displayName: string;
    role: string;
    status: string;
    kycStatus: string;
    hasManualIdDoc?: boolean;
    manualIdDocStatus?: string;
    manualIdDocUploadedAt?: string | null;
    manualIdDocNote?: string | null;
    isAmbassador?: boolean;
    agentCode?: string | null;
    createdAt: string;
  }>;
  pendingAmbassadorRequests?: Array<{
    id: string;
    email: string;
    displayName: string;
    role: string;
    status: string;
    kycStatus: string;
    ambassadorWhatsapp: string | null;
    ambassadorRequestedAt: string | null;
    ambassadorRequestStatus: string;
    createdAt: string;
  }>;
  pendingWalletWithdrawals?: Array<{
    id: string;
    amountCents: number;
    currency: string;
    status: string;
    channel: string;
    provider: string | null;
    destinationHint: string;
    bankName: string | null;
    bankHolder: string | null;
    bankAccount: string | null;
    bankIban: string | null;
    createdAt: string;
    user: {
      id: string;
      email: string;
      displayName: string;
      country: string | null;
      phone: string | null;
    };
  }>;
  openReports: Array<{
    id: string;
    reason: string;
    details: string | null;
    createdAt: string;
    communityPostId?: string | null;
    communityPost?: {
      id: string;
      title: string | null;
      body: string;
      status: string;
    } | null;
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
  usersMatching?: number;
};

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function hasViewableManualId(u: {
  hasManualIdDoc?: boolean;
  manualIdDocStatus?: string;
}) {
  if (u.hasManualIdDoc) return true;
  const status = u.manualIdDocStatus;
  return (
    status === "SUBMITTED" ||
    status === "APPROVED" ||
    status === "REJECTED"
  );
}

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
  const [communityPosts, setCommunityPosts] = useState<
    Array<{
      id: string;
      kind: string;
      title: string | null;
      body: string;
      status: string;
      createdAt: string;
      viewCount: number;
      commentCount: number;
      reportCount: number;
      author: { id: string; displayName: string; email: string };
    }>
  >([]);
  const [userLetter, setUserLetter] = useState<string>("");
  const [userQuery, setUserQuery] = useState("");
  const [userQueryDraft, setUserQueryDraft] = useState("");
  const [userFrom, setUserFrom] = useState("");
  const [userTo, setUserTo] = useState("");
  const [userFromDraft, setUserFromDraft] = useState("");
  const [userToDraft, setUserToDraft] = useState("");
  const [exportingEmails, setExportingEmails] = useState(false);
  const [sendingPlayInvite, setSendingPlayInvite] = useState(false);

  async function load(opts?: {
    letter?: string;
    q?: string;
    from?: string;
    to?: string;
  }) {
    const letter = opts?.letter ?? userLetter;
    const q = opts?.q ?? userQuery;
    const from = opts?.from ?? userFrom;
    const to = opts?.to ?? userTo;
    const params = new URLSearchParams();
    if (letter) params.set("letter", letter);
    if (q.trim()) params.set("q", q.trim());
    if (from.trim()) params.set("from", from.trim());
    if (to.trim()) params.set("to", to.trim());
    const qs = params.toString();
    const res = await fetch(`/api/admin${qs ? `?${qs}` : ""}`);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Accès refusé");
      return;
    }
    setData(json);
  }

  async function loadCommunityPosts() {
    const res = await fetch("/api/admin/community-posts?limit=50");
    const json = await res.json();
    if (res.ok) setCommunityPosts(json.posts ?? []);
  }

  useEffect(() => {
    void load();
    void loadCommunityPosts();
    // initial load only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setCommunityStatus(
    postId: string,
    status: "OPEN" | "HIDDEN" | "REMOVED"
  ) {
    const res = await fetch("/api/admin/community-posts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, status }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      window.alert(json.error ?? "Action impossible");
      return;
    }
    await loadCommunityPosts();
  }

  function applyUserLetter(next: string) {
    setUserLetter(next);
    void load({
      letter: next,
      q: userQuery,
      from: userFrom,
      to: userTo,
    });
  }

  function applyUserSearch(e: FormEvent) {
    e.preventDefault();
    setUserQuery(userQueryDraft);
    setUserFrom(userFromDraft);
    setUserTo(userToDraft);
    void load({
      letter: userLetter,
      q: userQueryDraft,
      from: userFromDraft,
      to: userToDraft,
    });
  }

  function resetUserFilters() {
    setUserLetter("");
    setUserQuery("");
    setUserQueryDraft("");
    setUserFrom("");
    setUserTo("");
    setUserFromDraft("");
    setUserToDraft("");
    void load({ letter: "", q: "", from: "", to: "" });
  }

  async function action(
    userId: string,
    actionName: string,
    extra?: { note?: string; force?: boolean; withdrawalId?: string; mark?: string }
  ) {
    const res = await fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: userId || undefined,
        action: actionName,
        ...extra,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      window.alert(json.error ?? "Action impossible");
      return;
    }
    if (actionName === "promote_ambassador" && json.inviteUrl) {
      try {
        await navigator.clipboard.writeText(json.inviteUrl);
      } catch {
        /* ignore clipboard errors */
      }
    }
    if (actionName === "email_ambassador_invite") {
      window.alert(
        `Email envoyé à ${json.email ?? "le Héraut Réseau"} avec le code ${json.agentCode ?? ""}.`
      );
    }
    if (actionName === "payout_herald_commissions") {
      if (json.skipped) {
        window.alert(
          json.reason ??
            `Aucune commission à verser${json.amountCents != null ? ` (solde ${json.amountCents} ¢)` : ""}.`
        );
      } else {
        window.alert(
          `Commissions versées : ${((json.amountCents as number) / 100).toFixed(2)} $ · ${json.commissionCount ?? "?"} lignes · transfer ${json.stripeTransferId ?? "—"}`
        );
      }
    }
    if (actionName === "complete_wallet_withdrawal") {
      window.alert(`Retrait marqué : ${json.status ?? "OK"}`);
    }
    await load();
  }

  async function copyInvite(agentCode: string) {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/register?ref=${encodeURIComponent(agentCode)}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copiez le lien Héraut Réseau :", url);
    }
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

  async function deleteBooking(bookingId: string) {
    if (
      !confirm(
        "Supprimer définitivement cette offre / paiement en attente ? Cette action est irréversible."
      )
    ) {
      return;
    }
    const res = await fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "delete_booking",
        bookingId,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      window.alert(data.error ?? "Suppression impossible");
      return;
    }
    await load();
  }

  async function downloadUsersEmailsCsv() {
    setExportingEmails(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users-emails-csv");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Export impossible");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers
          .get("Content-Disposition")
          ?.match(/filename="?([^"]+)"?/)?.[1] || "rfacto-users-emails.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export CSV échoué");
    } finally {
      setExportingEmails(false);
    }
  }

  async function sendPlayStoreTestInvites() {
    const ok = window.confirm(
      "Envoyer l'invitation Google Play (tests internes) par e-mail à TOUS les comptes actifs non suspendus ?\n\n" +
        "Liens inclus :\n" +
        "• https://play.google.com/apps/testing/com.rfacto.app\n" +
        "• https://play.google.com/store/apps/details?id=com.rfacto.app\n\n" +
        "Action temporaire — peut prendre plusieurs minutes."
    );
    if (!ok) return;

    setSendingPlayInvite(true);
    setError("");
    try {
      const res = await fetch("/api/admin/play-test-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        total?: number;
        sent?: number;
        failed?: number;
        errors?: string[];
      };
      if (!res.ok) {
        throw new Error(data.error || "Envoi impossible");
      }
      const detail =
        data.errors?.length ? `\n\nExemples d'erreurs :\n${data.errors.join("\n")}` : "";
      window.alert(
        `Invitation Play Store envoyée.\n\nDestinataires : ${data.total ?? 0}\nRéussis : ${data.sent ?? 0}\nÉchecs : ${data.failed ?? 0}${detail}`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Envoi invitation Play échoué");
    } finally {
      setSendingPlayInvite(false);
    }
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
            Administration
          </h1>
          <p className="text-[var(--muted)]">
            KYC, paiements escrow, suspensions et litiges.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={exportingEmails || sendingPlayInvite}
              onClick={() => void downloadUsersEmailsCsv()}
              title="CSV des courriels pour testeurs Google Play / App Store"
            >
              {exportingEmails
                ? "Export en cours…"
                : "↓ CSV courriels (testeurs store)"}
            </Button>
            <Button
              type="button"
              disabled={sendingPlayInvite || exportingEmails}
              onClick={() => void sendPlayStoreTestInvites()}
              title="E-mail groupé temporaire — liens de test Google Play"
            >
              {sendingPlayInvite
                ? "Envoi e-mails…"
                : "✉ Invitation Play à tous"}
            </Button>
          </div>
          <p className="max-w-sm text-right text-xs text-[var(--muted)]">
            CSV pour la liste Play Console. Puis «&nbsp;Invitation Play à
            tous&nbsp;» envoie les liens de test aux comptes actifs (temporaire).
          </p>
        </div>
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
          ["Demandes colis", data.stats.requests],
          ["Services (total)", data.stats.services ?? 0],
          ["Services ouverts", data.stats.servicesOpen ?? 0],
          ["Services fermés", data.stats.servicesClosed ?? 0],
          ["Prestataires services", data.stats.serviceProviders ?? 0],
          ["Boutiques ouvertes", data.stats.shopsOpen ?? 0],
          ["Commandes boutique payées", data.stats.shopOrdersPaid ?? 0],
          ["Rencontres (profils)", data.stats.meetProfilesTotal ?? 0],
          ["Rencontres actives", data.stats.meetProfilesActive ?? 0],
          ["Rencontres affaires", data.stats.meetBusiness ?? 0],
          ["Rencontres amour", data.stats.meetRomance ?? 0],
          ["Contacts rencontre en attente", data.stats.meetContactsPending ?? 0],
          ["Contacts rencontre acceptés", data.stats.meetContactsAccepted ?? 0],
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

      {(data.stats.servicesByCategory?.length ?? 0) > 0 && (
        <section className="space-y-3">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
            Services ouverts par catégorie
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.stats.servicesByCategory!.map((row) => (
              <Card key={row.category}>
                <CardDescription>
                  {categoryLabel(row.category, "fr")}
                </CardDescription>
                <CardTitle className="mt-2 text-2xl">{row.count}</CardTitle>
              </Card>
            ))}
          </div>
        </section>
      )}

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
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => void deleteBooking(b.id)}
                >
                  Supprimer
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
          Retraits portefeuille (Mobile Money / banque)
        </h2>
        <p className="text-sm text-[var(--muted)]">
          Après envoi réel (MoMo ou virement bancaire), marquez « Envoyé ».
          {(data.pendingWalletWithdrawals?.length ?? 0) === 0
            ? " Aucune demande en attente."
            : ` ${data.pendingWalletWithdrawals!.length} en attente.`}
        </p>
        {(data.pendingWalletWithdrawals ?? []).map((w) => (
          <Card
            key={w.id}
            className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">
                  {w.user.displayName} ·{" "}
                  {formatMoneyFromCents(w.amountCents, w.currency || "CAD")}
                </CardTitle>
                <CardDescription>
                  {w.user.email}
                  {w.user.country ? ` · ${w.user.country}` : ""}
                  {w.user.phone ? ` · ${w.user.phone}` : ""}
                </CardDescription>
                <p className="mt-2 text-sm">
                  <span className="font-medium uppercase">{w.channel}</span>
                  {w.provider ? ` · ${w.provider}` : ""} · {w.destinationHint}
                </p>
                {(w.bankAccount || w.bankIban) && (
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {[w.bankHolder, w.bankName, w.bankIban || w.bankAccount]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {formatDate(w.createdAt)} · {w.status}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() =>
                    void action("", "complete_wallet_withdrawal", {
                      withdrawalId: w.id,
                      mark: "SENT",
                    })
                  }
                >
                  Marquer envoyé
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() =>
                    void action("", "complete_wallet_withdrawal", {
                      withdrawalId: w.id,
                      mark: "CANCELLED",
                    })
                  }
                >
                  Annuler
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Demandes Héraut Réseau
        </h2>
        <p className="text-sm text-[var(--muted)]">
          Candidatures avec numéro WhatsApp pour contact direct.
          {(data.pendingAmbassadorRequests?.length ?? 0) === 0
            ? " Aucune demande en attente."
            : ` ${data.pendingAmbassadorRequests!.length} demande(s).`}
        </p>
        {(data.pendingAmbassadorRequests ?? []).map((u) => {
          const wa = (u.ambassadorWhatsapp ?? "").replace(/[^\d+]/g, "");
          const waDigits = wa.replace(/\D/g, "");
          return (
            <Card
              key={`amb-req-${u.id}`}
              className="border-[var(--accent)]/30 bg-[var(--accent-soft)]/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{u.displayName}</CardTitle>
                  <CardDescription>
                    {u.email} · KYC:{" "}
                    {KYC_STATUS_LABELS[u.kycStatus] ?? u.kycStatus}
                    {u.ambassadorRequestedAt
                      ? ` · demandé ${formatDate(u.ambassadorRequestedAt)}`
                      : ""}
                  </CardDescription>
                  <p className="mt-2 text-sm">
                    WhatsApp :{" "}
                    {waDigits ? (
                      <a
                        href={`https://wa.me/${waDigits}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-[var(--accent)] underline"
                      >
                        {u.ambassadorWhatsapp}
                      </a>
                    ) : (
                      u.ambassadorWhatsapp ?? "—"
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => action(u.id, "promote_ambassador")}
                  >
                    Valider (nommer)
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() =>
                      action(u.id, "reject_ambassador_request")
                    }
                  >
                    Refuser
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </section>

      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Pièces d&apos;identité manuelles
        </h2>
        <p className="text-sm text-[var(--muted)]">
          Dossiers manuels en attente (uniquement si le KYC Stripe n&apos;est
          pas encore validé).
          {(data.pendingManualIds?.length ?? 0) === 0
            ? " Aucune pièce à revoir."
            : ` ${data.pendingManualIds!.length} dossier(s).`}
        </p>
        {(data.pendingManualIds ?? []).map((u) => (
          <Card
            key={`manual-${u.id}`}
            className="border-amber-300/60 bg-amber-50/40"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">{u.displayName}</CardTitle>
                <CardDescription>
                  {u.email} · KYC:{" "}
                  {KYC_STATUS_LABELS[u.kycStatus] ?? u.kycStatus}
                  {u.manualIdDocStatus
                    ? ` · pièce: ${u.manualIdDocStatus}`
                    : ""}
                  {u.manualIdDocUploadedAt
                    ? ` · envoyé ${formatDate(u.manualIdDocUploadedAt)}`
                    : ""}
                </CardDescription>
                {u.manualIdDocNote ? (
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    Note : {u.manualIdDocNote}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() =>
                    window.open(
                      `/api/admin/manual-id?userId=${encodeURIComponent(u.id)}`,
                      "_blank",
                      "noopener,noreferrer"
                    )
                  }
                >
                  Voir la pièce
                </Button>
                {u.kycStatus !== "VERIFIED" && (
                  <Button
                    size="sm"
                    onClick={() => action(u.id, "mark_kyc_verified")}
                  >
                    Valider pièce (KYC)
                  </Button>
                )}
                {(u.manualIdDocStatus === "SUBMITTED" ||
                  u.kycStatus === "REQUIRES_INPUT") &&
                  u.kycStatus !== "VERIFIED" && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        const note = window.prompt(
                          "Motif du refus (optionnel) :",
                          ""
                        );
                        if (note === null) return;
                        void action(u.id, "reject_manual_id", {
                          note: note.trim() || undefined,
                        });
                      }}
                    >
                      Refuser la pièce
                    </Button>
                  )}
              </div>
            </div>
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
              Utilisateurs
            </h2>
            <p className="text-sm text-[var(--muted)]">
              {data.usersMatching ?? data.users.length} résultat
              {(data.usersMatching ?? data.users.length) === 1 ? "" : "s"}
              {userLetter ? ` · lettre ${userLetter}` : ""}
              {userQuery ? ` · « ${userQuery} »` : ""}
              {userFrom || userTo
                ? ` · inscrit ${userFrom || "…"} → ${userTo || "…"}`
                : ""}
              {data.users.length >= 100 ? " (100 max affichés)" : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={exportingEmails}
              onClick={() => void downloadUsersEmailsCsv()}
              title="CSV des courriels pour testeurs Google Play / App Store"
            >
              {exportingEmails
                ? "Export…"
                : "CSV courriels (testeurs store)"}
            </Button>
          <form
            onSubmit={applyUserSearch}
            className="flex flex-wrap items-end gap-2"
          >
            <label className="text-xs text-[var(--muted)]">
              Du
              <input
                type="date"
                value={userFromDraft}
                onChange={(e) => setUserFromDraft(e.target.value)}
                className="mt-1 block h-9 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-sm"
              />
            </label>
            <label className="text-xs text-[var(--muted)]">
              Au
              <input
                type="date"
                value={userToDraft}
                onChange={(e) => setUserToDraft(e.target.value)}
                className="mt-1 block h-9 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-sm"
              />
            </label>
            <input
              value={userQueryDraft}
              onChange={(e) => setUserQueryDraft(e.target.value)}
              placeholder="Nom ou email…"
              className="h-9 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
            />
            <Button type="submit" size="sm">
              Chercher
            </Button>
            {(userQuery || userLetter || userFrom || userTo) && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={resetUserFilters}
              >
                Réinitialiser
              </Button>
            )}
          </form>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            size="sm"
            variant={userLetter === "" ? "secondary" : "outline"}
            onClick={() => applyUserLetter("")}
          >
            Tous
          </Button>
          {LETTERS.map((L) => (
            <Button
              key={L}
              type="button"
              size="sm"
              variant={userLetter === L ? "secondary" : "outline"}
              className="min-w-9 px-2"
              onClick={() => applyUserLetter(L)}
            >
              {L}
            </Button>
          ))}
        </div>

        {data.users.length === 0 && (
          <p className="text-sm text-[var(--muted)]">
            Aucun utilisateur pour ce filtre.
          </p>
        )}
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
                  {u.manualIdDocStatus === "SUBMITTED" &&
                    u.kycStatus !== "VERIFIED" && (
                    <Badge className="bg-amber-100 text-amber-900">
                      Pièce manuelle à valider
                    </Badge>
                  )}
                  {u.hasManualIdDoc &&
                    u.kycStatus === "REQUIRES_INPUT" &&
                    u.manualIdDocStatus !== "SUBMITTED" && (
                      <Badge className="bg-amber-100 text-amber-900">
                        Pièce + action requise
                      </Badge>
                    )}
                  {u.manualIdDocStatus === "APPROVED" && (
                    <Badge className="bg-[var(--accent-soft)] text-[var(--accent)]">
                      Pièce manuelle OK
                    </Badge>
                  )}
                  {u.manualIdDocStatus === "REJECTED" &&
                    u.kycStatus !== "VERIFIED" && (
                    <Badge>Pièce manuelle refusée</Badge>
                  )}
                  {u.stripeConnectChargesEnabled && (
                    <Badge className="bg-[var(--accent-soft)] text-[var(--accent)]">
                      Connect OK
                    </Badge>
                  )}
                  {u.isAmbassador && (
                    <Badge className="bg-[var(--accent-soft)] text-[var(--accent)]">
                      Héraut Réseau
                    </Badge>
                  )}
                  {!u.isAmbassador &&
                    u.ambassadorRequestStatus === "PENDING" && (
                      <Badge className="bg-amber-100 text-amber-900">
                        Demande Héraut Réseau
                      </Badge>
                    )}
                  {!u.isAmbassador &&
                    u.ambassadorRequestStatus === "REJECTED" && (
                      <Badge>Demande amb. refusée</Badge>
                    )}
                </div>
                {u.ambassadorRequestStatus === "PENDING" &&
                  u.ambassadorWhatsapp && (
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      WhatsApp demande :{" "}
                      <a
                        href={`https://wa.me/${u.ambassadorWhatsapp.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--accent)] underline"
                      >
                        {u.ambassadorWhatsapp}
                      </a>
                    </p>
                  )}
                {(u.isAmbassador || u.agentCode) && (
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    Code {u.agentCode ?? "—"} · {u._count?.referrals ?? 0}{" "}
                    filleul{(u._count?.referrals ?? 0) === 1 ? "" : "s"}
                  </p>
                )}
                {u.manualIdDocNote && u.manualIdDocStatus === "SUBMITTED" ? (
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    Note utilisateur : {u.manualIdDocNote}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {hasViewableManualId(u) && (
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={() =>
                      window.open(
                        `/api/admin/manual-id?userId=${encodeURIComponent(u.id)}`,
                        "_blank",
                        "noopener,noreferrer"
                      )
                    }
                  >
                    Voir la pièce
                  </Button>
                )}
                {u.kycStatus !== "VERIFIED" && (
                  <Button
                    size="sm"
                    onClick={() => action(u.id, "mark_kyc_verified")}
                  >
                    {u.manualIdDocStatus === "SUBMITTED" ||
                    u.kycStatus === "REQUIRES_INPUT"
                      ? "Valider pièce (KYC)"
                      : "Forcer KYC"}
                  </Button>
                )}
                {hasViewableManualId(u) &&
                  u.kycStatus !== "VERIFIED" &&
                  u.manualIdDocStatus !== "APPROVED" && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        const note = window.prompt(
                          "Motif du refus (optionnel) :",
                          ""
                        );
                        if (note === null) return;
                        void action(u.id, "reject_manual_id", {
                          note: note.trim() || undefined,
                        });
                      }}
                    >
                      Refuser la pièce
                    </Button>
                  )}
                {!u.isAmbassador ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => action(u.id, "promote_ambassador")}
                  >
                    Nommer Héraut Réseau
                  </Button>
                ) : (
                  <>
                    {u.agentCode && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyInvite(u.agentCode!)}
                      >
                        Copier le lien
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => action(u.id, "email_ambassador_invite")}
                    >
                      Envoyer par email
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (
                          !window.confirm(
                            "Verser le solde des commissions Héraut (ACCRUED) via Stripe Connect ?"
                          )
                        ) {
                          return;
                        }
                        void action(u.id, "payout_herald_commissions", {
                          force: true,
                        });
                      }}
                    >
                      Payer commissions
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => action(u.id, "revoke_ambassador")}
                    >
                      Révoquer
                    </Button>
                  </>
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
          Publications communauté
        </h2>
        {communityPosts.length === 0 && (
          <p className="text-sm text-[var(--muted)]">Aucune publication.</p>
        )}
        {communityPosts.map((p) => (
          <Card key={p.id}>
            <CardTitle className="text-base">
              {p.title || p.body.slice(0, 60)}
            </CardTitle>
            <CardDescription>
              {p.author.displayName} · {p.kind} · {p.status} ·{" "}
              {formatDate(p.createdAt)} · {p.commentCount} com. ·{" "}
              {p.reportCount} signal.
            </CardDescription>
            <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">
              {p.body}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {p.status !== "OPEN" && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void setCommunityStatus(p.id, "OPEN")}
                >
                  Restaurer
                </Button>
              )}
              {p.status !== "HIDDEN" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void setCommunityStatus(p.id, "HIDDEN")}
                >
                  Masquer
                </Button>
              )}
              {p.status !== "REMOVED" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void setCommunityStatus(p.id, "REMOVED")}
                >
                  Retirer
                </Button>
              )}
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
              {r.communityPost
                ? `Publication signalée (${r.targetUser.displayName})`
                : `${r.targetUser.displayName} signalé`}{" "}
              par {r.reporter.displayName}
            </CardTitle>
            <CardDescription>
              {r.reason}
              {r.details ? ` — ${r.details}` : ""}
              {r.communityPost
                ? ` — « ${(r.communityPost.title || r.communityPost.body).slice(0, 80)} »`
                : ""}
            </CardDescription>
            <div className="mt-3 flex flex-wrap gap-2">
              {r.communityPost && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void setCommunityStatus(r.communityPost!.id, "HIDDEN")
                  }
                >
                  Masquer la publication
                </Button>
              )}
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
