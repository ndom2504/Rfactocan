"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/locale-provider";

type Props = {
  agentCode: string;
  referralCount: number;
  displayName: string;
};

export function AmbassadorEarnPanel({
  agentCode,
  referralCount,
  displayName,
}: Props) {
  const { t, locale } = useI18n();
  const [copied, setCopied] = useState(false);

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

  return (
    <Card
      className="border-[var(--accent)]/30 bg-[var(--accent-soft)]/40"
      data-tour="ambassador-earn"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
        {t("ambassador_badge")}
      </p>
      <CardTitle className="mt-1 text-xl">
        {t("ambassador_earn_title")}
      </CardTitle>
      <CardDescription className="mt-2 text-[var(--foreground)]/80">
        {t("ambassador_earn_lead").replace("{name}", displayName)}
      </CardDescription>

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
          <p className="self-center text-sm text-[var(--muted)]">
            {referralCount} {t("ambassador_referrals")}
          </p>
        </div>
      </div>

      <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[var(--foreground)]/90">
        <li>{t("ambassador_earn_step1")}</li>
        <li>{t("ambassador_earn_step2")}</li>
        <li>{t("ambassador_earn_step3")}</li>
        <li>{t("ambassador_earn_step4")}</li>
      </ol>

      <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">
        {t("ambassador_earn_note")}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/profile">
          <Button type="button" variant="outline" size="sm">
            {locale === "en" ? "Payouts / KYC" : "Paiements / KYC"}
          </Button>
        </Link>
        <Link href="/services/new">
          <Button type="button" variant="outline" size="sm">
            {t("publish_service_cta")}
          </Button>
        </Link>
      </div>
    </Card>
  );
}
