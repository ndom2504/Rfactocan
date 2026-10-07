"use client";

import { ServiceSearch } from "@/components/service-search";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/components/locale-provider";

export default function ServicesSearchPage() {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          {t("services_title")}
        </h1>
        <p className="text-[var(--muted)]">{t("services_subtitle")}</p>
      </div>

      <Card>
        <ServiceSearch hideHeading plain />
      </Card>
    </div>
  );
}
