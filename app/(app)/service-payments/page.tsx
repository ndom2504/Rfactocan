"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/locale-provider";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { formatMoneyFromCents } from "@/lib/currency";

type PaymentRow = {
  id: string;
  title: string;
  amountCents: number;
  currency: string;
  status: string;
  clientId: string;
  createdAt: string;
  provider?: { displayName?: string };
  client?: { displayName?: string };
};

function statusKey(status: string) {
  switch (status) {
    case "AWAITING_PAYMENT":
      return "svc_pay_status_AWAITING_PAYMENT" as const;
    case "AWAITING_CONFIRMATION":
      return "svc_pay_status_AWAITING_CONFIRMATION" as const;
    case "PAID":
      return "svc_pay_status_PAID" as const;
    case "CANCELLED":
      return "svc_pay_status_CANCELLED" as const;
    case "EXPIRED":
      return "svc_pay_status_EXPIRED" as const;
    default:
      return null;
  }
}

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
    return () => {
      cancelled = true;
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
          const status = statusKey(p.status);
          return (
            <Card key={p.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="text-base">{p.title}</CardTitle>
                  <CardDescription>
                    {iPay ? t("svc_pay_you_pay") : t("svc_pay_you_receive")}
                    {` · ${other || "—"} · ${formatMoneyFromCents(p.amountCents, p.currency)}`}
                    {status ? ` · ${t(status)}` : ""}
                    {p.createdAt ? ` · ${formatDate(p.createdAt)}` : ""}
                  </CardDescription>
                </div>
                <Link href={`/service-payments/${p.id}`}>
                  <Button variant="outline" size="sm">
                    {t("svc_pay_open")}
                  </Button>
                </Link>
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
