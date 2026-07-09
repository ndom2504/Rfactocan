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
      label: locale === "en" ? "Identity verified (KYC)" : "Identité vérifiée (KYC)",
    },
    {
      ok: connectCharges,
      label:
        locale === "en"
          ? "Bank account linked (Stripe Express)"
          : "Compte bancaire lié (Stripe Express)",
    },
    {
      ok: connectPayouts,
      label:
        locale === "en"
          ? "Payouts enabled"
          : "Virements activés",
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
          {locale === "en"
            ? "Stripe is not configured on this server (demo mode)."
            : "Stripe n'est pas configuré sur ce serveur (mode démo)."}
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
              {locale === "en" ? "Complete in Profile" : "Compléter dans Profil"}
            </Button>
          </Link>
        </div>
      )}
    </Card>
  );
}
