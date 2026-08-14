"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/locale-provider";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { formatMoneyFromCents } from "@/lib/currency";
import { servicePaymentStatusI18nKey } from "@/lib/service-payment-status";

type PaymentRow = {
  id: string;
  title: string;
  amountCents: number;
  currency: string;
  status: string;
  clientId: string;
  createdAt: string;
  escrowUntilConfirm?: boolean;
  provider?: { displayName?: string };
  client?: { displayName?: string };
};

export default function ServicePaymentsInboxPage() {
  const { t } = useI18n();
  const [meId, setMeId] = useState("");
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [meRes, payRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/service-payments"),
        ]);
        const meData = await meRes.json().catch(() => ({}));
        const payData = await payRes.json().catch(() => ({}));
        if (cancelled) return;
        if (meRes.ok) setMeId(meData.user?.id ?? "");
        if (!payRes.ok) {
          setError(payData.error || t("svc_pay_empty"));
          setPayments([]);
        } else {
          setPayments(payData.payments ?? []);
          setError("");
        }
      } catch {
        if (!cancelled) {
          setError(t("svc_pay_empty"));
          setPayments([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    const timer = setInterval(() => void load(), 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [t]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          {t("svc_pay_inbox")}
        </h1>
        <p className="text-[var(--muted)]">{t("svc_pay_inbox_hint")}</p>
      </div>
      {loading && (
        <p className="text-sm text-[var(--muted)]">{t("loading")}</p>
      )}
      {error && !loading && (
        <p className="text-sm text-[var(--muted)]">{error}</p>
      )}
      <div className="space-y-3">
        {payments.map((p) => {
          const iPay = p.clientId === meId;
          const other = iPay
            ? p.provider?.displayName
            : p.client?.displayName;
          const status = servicePaymentStatusI18nKey(p.status, {
            isClient: iPay,
            escrowUntilConfirm: p.escrowUntilConfirm,
          });
          const open =
            p.status === "AWAITING_PAYMENT" ||
            p.status === "AWAITING_CONFIRMATION";
          const followUp =
            p.status === "PAID" || p.status === "DELIVERED";
          return (
            <Card key={p.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="text-base">{p.title}</CardTitle>
                  <CardDescription>
                    {`${other || "—"} · ${formatMoneyFromCents(p.amountCents, p.currency)}`}
                    {status ? ` · ${t(status)}` : ""}
                    {p.createdAt ? ` · ${formatDate(p.createdAt)}` : ""}
                  </CardDescription>
                </div>
                {open || followUp ? (
                  <Link href={`/service-payments/${p.id}`}>
                    <Button variant="outline" size="sm">
                      {open && iPay
                        ? t("svc_pay_pay")
                        : p.status === "DELIVERED" && iPay
                          ? t("svc_pay_confirm_delivery")
                          : t("svc_pay_open")}
                    </Button>
                  </Link>
                ) : (
                  <span className="text-sm font-medium text-[var(--muted)]">
                    {status ? t(status) : ""}
                  </span>
                )}
              </div>
            </Card>
          );
        })}
        {!loading && !error && payments.length === 0 && (
          <p className="text-sm text-[var(--muted)]">{t("svc_pay_empty")}</p>
        )}
      </div>
    </div>
  );
}
