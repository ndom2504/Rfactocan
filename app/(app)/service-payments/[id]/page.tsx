"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import { formatMoneyFromCents } from "@/lib/currency";

type Payment = {
  id: string;
  title: string;
  description: string;
  amountCents: number;
  currency: string;
  status: string;
  payMethod?: string | null;
  receiverHint?: string | null;
  threadId?: string | null;
  provider: {
    id: string;
    displayName: string;
    avatarUrl?: string | null;
  };
  client: { id: string; displayName: string; avatarUrl?: string | null };
};

function isOpen(status: string) {
  return status === "AWAITING_PAYMENT" || status === "AWAITING_CONFIRMATION";
}

function isTerminal(status: string) {
  return status === "PAID" || status === "CANCELLED" || status === "EXPIRED";
}

function statusLabel(
  status: string,
  role: string,
  t: ReturnType<typeof useI18n>["t"]
) {
  switch (status) {
    case "AWAITING_PAYMENT":
      return role === "client"
        ? t("svc_pay_pending_to_pay")
        : t("svc_pay_status_waiting");
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
  const [interacReceiver, setInteracReceiver] = useState<string | null>(null);
  const [showOtherMethods, setShowOtherMethods] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load(): Promise<Payment | null> {
    const res = await fetch(`/api/service-payments/${id}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Erreur");
      return null;
    }
    setPayment(data.payment);
    setRole(data.role);
    setInteracReceiver(data.interacReceiver ?? null);
    setError("");
    return data.payment as Payment;
  }

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function tick() {
      const next = await load();
      if (cancelled || !next || isTerminal(next.status)) return;
      timer = setTimeout(tick, 3000);
    }
    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function act(action: string, extra?: Record<string, string | null>) {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/service-payments/${id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.alreadyPaid) {
      await load();
      return;
    }
    if (!res.ok) {
      setError(data.error || "Erreur");
      await load();
      return;
    }
    if (data.checkoutUrl || data.url) {
      window.location.href = data.checkoutUrl || data.url;
      return;
    }
    await load();
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
  const returnedOk = searchParams.get("payment") === "success";
  const displayStatus =
    returnedOk && !isTerminal(payment.status) ? "PAID" : payment.status;
  const payable =
    isClient &&
    payment.status === "AWAITING_PAYMENT" &&
    !returnedOk;
  const receiver =
    payment.receiverHint?.trim() || interacReceiver || null;
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

      <Card className="space-y-3">
        <CardTitle>{payment.title}</CardTitle>
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
          <p className="text-sm text-[var(--muted)]">
            {isClient
              ? payment.provider.displayName
              : payment.client.displayName}
          </p>
        </div>

        <p className="text-2xl font-semibold text-[var(--accent)]">
          {amountLabel}
        </p>
        {payment.description ? (
          <p className="text-sm whitespace-pre-wrap text-[var(--muted)]">
            {payment.description}
          </p>
        ) : null}
        <p className="text-sm font-medium">
          {statusLabel(displayStatus, role, t)}
        </p>

        {error && <p className="text-sm text-red-700">{error}</p>}

        {payable &&
          payment.payMethod !== "INTERAC" &&
          payment.payMethod !== "MOBILE" && (
          <div className="space-y-2 border-t border-[var(--border)] pt-4">
            <Button
              type="button"
              disabled={busy}
              className="w-full"
              onClick={() => void act("pay_card")}
            >
              {t("svc_pay_card")}
            </Button>
            <button
              type="button"
              className="text-xs text-[var(--muted)] underline"
              onClick={() => setShowOtherMethods((v) => !v)}
            >
              {t("svc_pay_other_methods")}
            </button>
            {showOtherMethods && (
              <div className="space-y-2">
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
              </div>
            )}
          </div>
        )}

        {payable && awaitingInteracSend && receiver && (
          <div className="space-y-3 border-t border-[var(--border)] pt-4">
            <p className="text-sm">
              {t("svc_pay_interac_step2")}{" "}
              <strong>{receiver}</strong>
            </p>
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

        {isClient && awaitingInteracConfirm && (
          <p className="text-sm text-[var(--muted)]">
            {t("svc_pay_status_AWAITING_CONFIRMATION")}
          </p>
        )}

        {payable &&
          payment.payMethod === "MOBILE" && (
            <Button
              type="button"
              disabled={busy}
              className="w-full"
              onClick={() => void act("client_mark_paid")}
            >
              {t("svc_pay_i_paid")}
            </Button>
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

        {isOpen(payment.status) && !returnedOk && (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void act("cancel")}
          >
            {t("cancel")}
          </Button>
        )}
      </Card>
    </div>
  );
}
