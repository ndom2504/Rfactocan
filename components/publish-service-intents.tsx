"use client";

import Link from "next/link";
import { useI18n } from "@/components/locale-provider";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

const INTENTS = [
  {
    href: "/trips/new",
    titleKey: "publish_intent_transport" as const,
    hint: "Trajet, capacité bagages / colis.",
    hintEn: "Route, luggage / parcel capacity.",
  },
  {
    href: "/requests/new?need=JOB_OFFER",
    titleKey: "publish_intent_job" as const,
    hint: "Offre d’emploi pour recruter.",
    hintEn: "Job offer to hire.",
  },
  {
    href: "/shops/new",
    titleKey: "publish_intent_shop" as const,
    hint: "Boutique en ligne pour vendre.",
    hintEn: "Online shop to sell.",
  },
];

export function PublishServiceIntents() {
  const { t, locale } = useI18n();
  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--muted)]">{t("publish_intents_hint")}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {INTENTS.map((item) => (
          <Link key={item.href} href={item.href} className="block">
            <Card className="h-full transition hover:border-[var(--accent)]">
              <CardTitle className="text-base">{t(item.titleKey)}</CardTitle>
              <CardDescription className="mt-1">
                {locale === "en" ? item.hintEn : item.hint}
              </CardDescription>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
