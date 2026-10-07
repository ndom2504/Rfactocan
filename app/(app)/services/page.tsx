"use client";

import Link from "next/link";
import { useI18n } from "@/components/locale-provider";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchServiceIntents } from "@/components/search-service-intents";

export default function ServicesHubPage() {
  const { t } = useI18n();

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

      <SearchServiceIntents />
    </div>
  );
}
