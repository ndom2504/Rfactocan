"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import { formatMoneyFromCents } from "@/lib/currency";

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
    stripeConnectPayoutsEnabled?: boolean;
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
  const [interacPreferred, setInteracPreferred] = useState(false);
  const [interacReceiver, setInteracReceiver] = useState<string | null>(null);
  const [providerInteracConfigured, setProviderInteracConfigured] =
    useState(false);
  const [providerCardEnabled, setProviderCardEnabled] = useState(false);
  const [showOtherMethods, setShowOtherMethods] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch(`/api/service-payments/${id}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Erreur");
      return;
    }
    setPayment(data.payment);
    setRole(data.role);
    setInteracPreferred(Boolean(data.interacPreferred));
    setInteracReceiver(data.interacReceiver ?? null);
    setProviderInteracConfigured(Boolean(data.providerInteracConfigured));
    setProviderCardEnabled(Boolean(data.providerCardEnabled));
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
    if (data.payment) {
      setPayment((prev) =>
        prev ? { ...prev, ...data.payment } : data.payment
      );
    }
    await load();
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

  const receiver =
    payment.receiverHint?.trim() || interacReceiver || null;
  const interacFlow =
    interacPreferred &&
    (payment.payMethod === "INTERAC" || payment.payMethod == null);
  const awaitingInteracSend =
    payment.payMethod === "INTERAC" && payment.status === "AWAITING_PAYMENT";
  const awaitingInteracConfirm =
    payment.payMethod === "INTERAC" &&
    payment.status === "AWAITING_CONFIRMATION";

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link
        href={payment.threadId ? `/messages/dm/${payment.threadId}` : "/messages"}
        className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        ← {t("messages_title")}
      </Link>
      <Link
        href="/service-payments"
        className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        ← {t("svc_pay_inbox")}
      </Link>

      <Card className="space-y-3">
        <CardTitle>{t("svc_pay_title")}</CardTitle>
        <CardDescription>
          {interacPreferred ? t("svc_pay_hint_interac") : t("svc_pay_hint")}
        </CardDescription>

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

        {error && <p className="text-sm text-red-700">{error}</p>}
        {message && <p className="text-sm text-[var(--accent)]">{message}</p>}

        {isProvider && !providerInteracConfigured && interacPreferred && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <p>{t("svc_pay_provider_setup_interac")}</p>
            <Link href="/profile" className="mt-2 inline-block text-[var(--accent)] underline">
              {t("nav_profile")}
            </Link>
          </div>
        )}

        {canPay && interacFlow && (
          <div className="space-y-3 border-t border-[var(--border)] pt-4">
            {!payment.payMethod && (
              <>
                {receiver ? (
                  <Button
                    type="button"
                    disabled={busy}
                    className="w-full"
                    onClick={() =>
                      void act("pay_interac", {
                        payProvider: "interac",
                        receiverHint: receiver,
                      })
                    }
                  >
                    {t("svc_pay_interac_primary")}
                  </Button>
                ) : (
                  <p className="rounded-lg bg-[var(--surface-2)] p-3 text-sm text-[var(--muted)]">
                    {t("svc_pay_interac_missing_receiver")}
                  </p>
                )}

                {(providerCardEnabled || !interacPreferred) && (
                  <button
                    type="button"
                    className="text-xs text-[var(--muted)] underline"
                    onClick={() => setShowOtherMethods((v) => !v)}
                  >
                    {t("svc_pay_other_methods")}
                  </button>
                )}
              </>
            )}

            {awaitingInteracSend && receiver && (
              <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/60 p-4">
                <p className="text-sm font-medium">{t("svc_pay_interac_steps_title")}</p>
                <ol className="list-decimal space-y-2 pl-5 text-sm text-[var(--muted)]">
                  <li>{t("svc_pay_interac_step1")}</li>
                  <li>
                    {t("svc_pay_interac_step2")}{" "}
                    <strong className="text-[var(--foreground)]">{receiver}</strong>
                  </li>
                  <li>
                    {t("svc_pay_interac_step3")}{" "}
                    <strong className="text-[var(--foreground)]">{amountLabel}</strong>
                  </li>
                  <li>{t("svc_pay_interac_step4")}</li>
                </ol>
                <Button
                  type="button"
                  disabled={busy}
                  className="w-full"
                  onClick={() => void act("client_mark_paid")}
                >
                  {t("svc_pay_i_paid")}
                </Button>
              </div>
            )}

            {(showOtherMethods || !interacPreferred) && !payment.payMethod && (
              <div className="space-y-2">
                {providerCardEnabled && (
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={() => void act("pay_card")}
                    className="w-full"
                    variant="outline"
                  >
                    {t("svc_pay_card")}
                  </Button>
                )}
                {!interacPreferred && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      className="w-full"
                      onClick={() =>
                        void act("pay_interac", {
                          payProvider: "interac",
                          receiverHint: receiver,
                        })
                      }
                    >
                      {t("svc_pay_interac")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      className="w-full"
                      onClick={() =>
                        void act("pay_mobile", { payProvider: "mobile_money" })
                      }
                    >
                      {t("svc_pay_mobile")}
                    </Button>
                  </>
                )}
              </div>
            )}

            {awaitingInteracConfirm && (
              <p className="text-sm text-[var(--muted)]">
                {t("svc_pay_interac_waiting_provider")}
              </p>
            )}
          </div>
        )}

        {canPay && !interacFlow && (
          <div className="space-y-3 border-t border-[var(--border)] pt-4">
            <p className="text-sm font-medium">{t("svc_pay_choose_method")}</p>
            {providerCardEnabled && (
              <Button
                type="button"
                disabled={busy}
                onClick={() => void act("pay_card")}
                className="w-full"
              >
                {t("svc_pay_card")}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              className="w-full"
              onClick={() =>
                void act("pay_interac", {
                  payProvider: "interac",
                  receiverHint: receiver,
                })
              }
            >
              {t("svc_pay_interac")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              className="w-full"
              onClick={() =>
                void act("pay_mobile", { payProvider: "mobile_money" })
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

        {isProvider && payment.status === "AWAITING_CONFIRMATION" && (
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
