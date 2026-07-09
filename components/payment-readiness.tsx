"use client";

import Link from "next/link";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

type Props = {
  locale: Locale;
  kycStatus: string;
  connectCharges: boolean;
  connectPayouts: boolean;
  stripeConfigured: boolean;
};

export function PaymentReadinessCard({
  locale,
  kycStatus,
  connectCharges,
  connectPayouts,
  stripeConfigured,
}: Props) {
  const steps = [
    {
      ok: kycStatus === "VERIFIED",
      label: t(locale, "kyc_step"),
    },
    {
      ok: connectCharges,
      label: t(locale, "bank_step"),
    },
    {
      ok: connectPayouts,
      label: t(locale, "payouts_step"),
    },
  ];
  const ready = steps.every((s) => s.ok) && stripeConfigured;

  return (
    <Card>
      <CardTitle className="text-base">
        {t(locale, "payment_checklist")}
      </CardTitle>
      <CardDescription className="mt-1">
        {ready
          ? t(locale, "payment_ready")
          : t(locale, "payment_steps_needed")}
      </CardDescription>
      {!stripeConfigured && (
        <p className="mt-2 text-xs text-[var(--muted)]">
          {t(locale, "stripe_demo")}
        </p>
      )}
      <ul className="mt-3 space-y-2">
        {steps.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-sm">
            <Badge
              className={
                s.ok
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : undefined
              }
            >
              {s.ok ? "OK" : "…"}
            </Badge>
            {s.label}
          </li>
        ))}
      </ul>
      {!ready && (
        <div className="mt-4">
          <Link href="/profile">
            <Button size="sm" variant="outline">
              {t(locale, "complete_in_profile")}
            </Button>
          </Link>
        </div>
      )}
    </Card>
  );
}
