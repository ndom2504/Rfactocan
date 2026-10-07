"use client";

import Link from "next/link";
import { useI18n } from "@/components/locale-provider";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

const INTENTS = [
  {
    href: "/trips/search",
    titleKey: "publish_intent_transport" as const,
    hint: "Trouvez des transporteurs pour vos colis.",
    hintEn: "Find carriers for your parcels.",
  },
  {
    href: "/requests/search?need=JOB_OFFER",
    titleKey: "publish_intent_job" as const,
    hint: "Cherchez des offres d'emploi.",
    hintEn: "Search for job offers.",
  },
  {
    href: "/shops/search",
    titleKey: "publish_intent_shop" as const,
    hint: "Explorez les boutiques du réseau.",
    hintEn: "Explore shops in the network.",
  },
  {
    href: "/services/search",
    titleKey: "publish_intent_service" as const,
    hint: "Services: hébergement, ménage, cours, etc.",
    hintEn: "Services: lodging, cleaning, lessons, etc.",
  },
];

export function SearchServiceIntents() {
  const { t, locale } = useI18n();
  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--muted)]">{t("search_intents_hint")}</p>
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
