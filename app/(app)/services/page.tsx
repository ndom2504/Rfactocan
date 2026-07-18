"use client";

import Link from "next/link";
import { useI18n } from "@/components/locale-provider";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SERVICE_CATALOG } from "@/lib/services-catalog";

export default function ServicesHubPage() {
  const { t, locale } = useI18n();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
            {t("services_title")}
          </h1>
          <p className="mt-1 max-w-2xl text-[var(--muted)]">
            {t("services_subtitle")}
          </p>
        </div>
        <Link href="/services/new">
          <Button>{t("services_publish")}</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICE_CATALOG.map((cat) => {
          const label = locale === "en" ? cat.labelEn : cat.labelFr;
          const hint = locale === "en" ? cat.hintEn : cat.hintFr;
          return (
            <Link key={cat.id} href={`/services/${cat.id}`}>
              <Card className="h-full transition hover:border-[var(--accent)]">
                <CardTitle className="text-lg">{label}</CardTitle>
                <CardDescription className="mt-2">{hint}</CardDescription>
                <p className="mt-3 text-sm text-[var(--accent)]">
                  {t("services_see_list")} →
                </p>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
