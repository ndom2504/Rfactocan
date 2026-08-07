"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import { formatMoneyFromCents } from "@/lib/currency";
import {
  loadUserIntent,
  payoutProviderLabelKey,
  type PayoutProvider,
} from "@/lib/user-intent";

type Payment = {
  id: string;
  title: string;
  description: string;
  amountCents: number;
  currency: string;
  platformFeeCents: number;
  providerPayoutCents: number;
  status: string;
  payMethod?: string | null;
  payProvider?: string | null;
  receiverHint?: string | null;
  threadId?: string | null;
  expiresAt?: string | null;
  clientMarkedPaidAt?: string | null;
  provider: {
    id: string;
    displayName: string;
    avatarUrl?: string | null;
    stripeConnectChargesEnabled?: boolean;
  };
  client: { id: string; displayName: string; avatarUrl?: string | null };
  listing?: { id: string; title: string } | null;
};

function statusLabel(status: string, t: ReturnType<typeof useI18n>["t"]) {
  switch (status) {
    case "AWAITING_PAYMENT":
      return t("svc_pay_status_AWAITING_PAYMENT");
    case "AWAITING_CONFIRMATION":
      return t("svc_pay_status_AWAITING_CONFIRMATION");
    case "PAID":
      return t("svc_pay_status_PAID");
    case "CANCELLED":
      return t("svc_pay_status_CANCELLED");
    case "EXPIRED":
      return t("svc_pay_status_EXPIRED");
    default:
      return status;
  }
}

export default function ServicePaymentPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [role, setRole] = useState<"client" | "provider" | "admin">("client");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const prefs = useMemo(() => loadUserIntent(), []);

  async function load() {
    const res = await fetch(`/api/service-payments/${id}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Erreur");
      return;
    }
    setPayment(data.payment);
    setRole(data.role);
    setError("");
  }

  useEffect(() => {
    void load();
    const pay = searchParams.get("payment");
    if (pay === "success") setMessage(t("svc_pay_success_return"));
    if (pay === "cancel") setError(t("svc_pay_cancel_return"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function act(action: string, extra?: Record<string, string | null>) {
    setBusy(true);
    setError("");
    setMessage("");
    const res = await fetch(`/api/service-payments/${id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Erreur");
      return;
    }
    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
      return;
    }
    if (data.payment) setPayment(data.payment);
    else void load();
    setMessage(t("svc_pay_action_ok"));
  }

  if (!payment && !error) {
    return <p className="text-sm text-[var(--muted)]">{t("loading")}</p>;
  }
  if (!payment) {
    return <p className="text-red-700">{error}</p>;
  }

  const amountLabel = formatMoneyFromCents(
    payment.amountCents,
    payment.currency.toUpperCase()
  );
  const isClient = role === "client";
  const isProvider = role === "provider";
  const canPay =
    isClient &&
    (payment.status === "AWAITING_PAYMENT" ||
      payment.status === "AWAITING_CONFIRMATION");

  const defaultChannel = prefs.payoutChannel;
  const defaultProvider: PayoutProvider = prefs.payoutProvider;
  const preferCard = defaultChannel === "bank";
  const preferInterac = defaultProvider === "interac";
  const preferMobile = defaultChannel === "mobile" && !preferInterac;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link
        href={payment.threadId ? `/messages/dm/${payment.threadId}` : "/messages"}
        className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        ← {t("messages_title")}
      </Link>

      <Card className="space-y-3">
        <CardTitle>{t("svc_pay_title")}</CardTitle>
        <CardDescription>{t("svc_pay_hint")}</CardDescription>

        <div className="flex items-center gap-3">
          <UserAvatar
            name={
              isClient
                ? payment.provider.displayName
                : payment.client.displayName
            }
            avatarUrl={
              isClient ? payment.provider.avatarUrl : payment.client.avatarUrl
            }
            size="lg"
          />
          <div>
            <p className="font-medium">{payment.title}</p>
            <p className="text-sm text-[var(--muted)]">
              {isClient
                ? payment.provider.displayName
                : payment.client.displayName}
            </p>
          </div>
        </div>

        <p className="text-2xl font-semibold text-[var(--accent)]">
          {amountLabel}
        </p>
        {payment.description && (
          <p className="text-sm whitespace-pre-wrap text-[var(--muted)]">
            {payment.description}
          </p>
        )}
        <p className="text-xs text-[var(--muted)]">
          {statusLabel(payment.status, t)}
        </p>
        {payment.payMethod && (
          <p className="text-xs text-[var(--muted)]">
            {t("svc_pay_method")}: {payment.payMethod}
            {payment.payProvider ? ` (${payment.payProvider})` : ""}
          </p>
        )}
        {payment.receiverHint && (
          <p className="rounded-lg bg-[var(--surface-2)] p-3 text-sm">
            {t("svc_pay_receiver")}: <strong>{payment.receiverHint}</strong>
          </p>
        )}

        {error && <p className="text-sm text-red-700">{error}</p>}
        {message && <p className="text-sm text-[var(--accent)]">{message}</p>}

        {canPay && (
          <div className="space-y-3 border-t border-[var(--border)] pt-4">
            <p className="text-sm font-medium">{t("svc_pay_choose_method")}</p>
            <p className="text-xs text-[var(--muted)]">
              {t("svc_pay_prefs_hint")} (
              {preferCard
                ? t("payout_bank")
                : preferInterac
                  ? t("payout_interac")
                  : t(payoutProviderLabelKey(defaultProvider))}
              )
            </p>

            {(preferCard ||
              payment.provider.stripeConnectChargesEnabled !== false) && (
              <Button
                type="button"
                disabled={busy}
                onClick={() => void act("pay_card")}
                className="w-full"
                variant={preferCard ? "default" : "outline"}
              >
                {t("svc_pay_card")}
              </Button>
            )}

            <Button
              type="button"
              variant={preferInterac ? "default" : "outline"}
              disabled={busy}
              className="w-full"
              onClick={() =>
                void act("pay_interac", {
                  payProvider: "interac",
                  receiverHint: payment.receiverHint ?? null,
                })
              }
            >
              {t("svc_pay_interac")}
            </Button>
            <Button
              type="button"
              variant={preferMobile ? "default" : "outline"}
              disabled={busy}
              className="w-full"
              onClick={() =>
                void act("pay_mobile", {
                  payProvider: defaultProvider,
                  receiverHint: payment.receiverHint ?? null,
                })
              }
            >
              {t("svc_pay_mobile")}
            </Button>

            {(payment.payMethod === "INTERAC" ||
              payment.payMethod === "MOBILE") &&
              payment.status === "AWAITING_PAYMENT" && (
                <Button
                  type="button"
                  disabled={busy}
                  className="w-full"
                  onClick={() => void act("client_mark_paid")}
                >
                  {t("svc_pay_i_paid")}
                </Button>
              )}
          </div>
        )}

        {isProvider &&
          payment.status === "AWAITING_CONFIRMATION" && (
            <Button
              type="button"
              disabled={busy}
              onClick={() => void act("provider_confirm")}
              className="w-full"
            >
              {t("svc_pay_confirm_received")}
            </Button>
          )}

        {(isClient || isProvider) &&
          payment.status !== "PAID" &&
          payment.status !== "CANCELLED" && (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void act("cancel")}
            >
              {t("cancel")}
            </Button>
          )}

        {payment.status === "PAID" && (
          <p className="text-sm font-medium text-[var(--accent)]">
            {t("svc_pay_paid")}
          </p>
        )}
      </Card>
    </div>
  );
}
