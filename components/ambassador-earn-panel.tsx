"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/locale-provider";
import { formatMoneyFromCents } from "@/lib/currency";
import type { AmbassadorKpis } from "@/lib/ambassador-stats";

type Props = {
  agentCode: string;
  displayName: string;
  /** Optional SSR seed (dashboard). */
  initialKpis?: AmbassadorKpis;
  /**
   * When true (dashboard), only show a button until the user opens the space.
   * Profile keeps the full panel by default.
   */
  collapsedByDefault?: boolean;
};

function formatCad(cents: number, locale: string) {
  return formatMoneyFromCents(cents, "CAD", locale === "en" ? "en-CA" : "fr-CA");
}

export function AmbassadorEarnPanel({
  agentCode,
  displayName,
  initialKpis,
  collapsedByDefault = false,
}: Props) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(!collapsedByDefault);
  const [copied, setCopied] = useState(false);
  const [kpis, setKpis] = useState<AmbassadorKpis | null>(initialKpis ?? null);
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [withdrawMsg, setWithdrawMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/ambassador/stats");
      if (!res.ok) return;
      const data = await res.json();
      if (!cancelled && data.kpis) setKpis(data.kpis);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const inviteUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return `/register?ref=${encodeURIComponent(agentCode)}`;
    }
    return `${window.location.origin}/register?ref=${encodeURIComponent(agentCode)}`;
  }, [agentCode]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(t("ambassador_copy_prompt"), inviteUrl);
    }
  }

  async function requestWithdraw() {
    setWithdrawBusy(true);
    setWithdrawMsg(null);
    try {
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setWithdrawMsg(data.error ?? t("wallet_withdraw_need_link"));
        return;
      }
      if (data.mode === "stripe") {
        setWithdrawMsg(t("wallet_withdraw_ok_stripe"));
      } else {
        setWithdrawMsg(t("wallet_withdraw_ok_manual"));
      }
      const stats = await fetch("/api/ambassador/stats");
      if (stats.ok) {
        const j = await stats.json();
        if (j.kpis) setKpis(j.kpis);
      }
    } catch {
      setWithdrawMsg(t("wallet_save_error"));
    } finally {
      setWithdrawBusy(false);
    }
  }

  const rewardPct = kpis ? (kpis.rewardBps / 100).toFixed(0) : "—";
  const canWithdraw = (kpis?.accruedRewardCents ?? 0) > 0;

  if (!open) {
    return (
      <div className="flex justify-center" data-tour="ambassador-earn">
        <Button
          type="button"
          variant="outline"
          className="border-[var(--accent)]/40 bg-[var(--accent-soft)]/50 text-[var(--accent)] hover:bg-[var(--accent-soft)]"
          onClick={() => setOpen(true)}
        >
          {t("ambassador_open_cta")}
        </Button>
      </div>
    );
  }

  return (
    <Card
      className="border-[var(--accent)]/30 bg-[var(--accent-soft)]/40"
      data-tour="ambassador-earn"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
            {t("ambassador_badge")}
          </p>
          <CardTitle className="mt-1 text-xl">
            {t("ambassador_earn_title")}
          </CardTitle>
        </div>
        {collapsedByDefault ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
          >
            {t("ambassador_close")}
          </Button>
        ) : null}
      </div>
      <CardDescription className="mt-2 text-[var(--foreground)]/80">
        {t("ambassador_earn_lead").replace("{name}", displayName)}
      </CardDescription>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs text-[var(--muted)]">
            {t("ambassador_kpi_referrals")}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {kpis?.referralCount ?? "…"}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs text-[var(--muted)]">
            {t("ambassador_kpi_kyc")}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {kpis?.referralsKycVerified ?? "…"}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs text-[var(--muted)]">
            {t("ambassador_kpi_volume")}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {kpis ? formatCad(kpis.networkVolumeCents, locale) : "…"}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {kpis
              ? `${kpis.networkPaymentsCount} ${t("ambassador_kpi_payments")}`
              : ""}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs text-[var(--muted)]">
            {t("ambassador_kpi_accrued")}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--accent)]">
            {kpis ? formatCad(kpis.accruedRewardCents ?? 0, locale) : "…"}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {t("ambassador_kpi_estimate_hint").replace(
              "{pct}",
              String(rewardPct)
            )}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs text-[var(--muted)]">
            {t("ambassador_kpi_paid")}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {kpis ? formatCad(kpis.paidRewardCents ?? 0, locale) : "…"}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs text-[var(--muted)]">
            {t("ambassador_kpi_estimate")}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {kpis ? formatCad(kpis.estimatedRewardCents, locale) : "…"}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <p className="text-xs text-[var(--muted)]">{t("ambassador_code_label")}</p>
        <p className="mt-1 font-mono text-lg font-semibold tracking-wider text-[var(--accent)]">
          {agentCode}
        </p>
        <p className="mt-3 break-all text-sm text-[var(--muted)]">{inviteUrl}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={() => void copyLink()}>
            {copied ? t("ambassador_copied") : t("ambassador_copy_link")}
          </Button>
        </div>
      </div>

      <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[var(--foreground)]/90">
        <li>{t("ambassador_earn_step1")}</li>
        <li>{t("ambassador_earn_step2")}</li>
        <li>{t("ambassador_earn_step3")}</li>
        <li>
          {t("ambassador_earn_step4").replace("{pct}", String(rewardPct))}
        </li>
      </ol>

      <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">
        {t("ambassador_earn_note")}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={withdrawBusy || !canWithdraw}
          onClick={() => void requestWithdraw()}
        >
          {withdrawBusy ? t("loading") : t("wallet_withdraw")}
        </Button>
        <Link href="/profile">
          <Button type="button" variant="outline" size="sm">
            {locale === "en" ? "Payouts / wallet" : "Portefeuille / retraits"}
          </Button>
        </Link>
        <Link href="/services/new">
          <Button type="button" variant="outline" size="sm">
            {t("publish_service_cta")}
          </Button>
        </Link>
      </div>
      {withdrawMsg && (
        <p className="mt-2 text-sm text-[var(--muted)]">{withdrawMsg}</p>
      )}
    </Card>
  );
}
