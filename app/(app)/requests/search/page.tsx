"use client";

import { RequestSearch } from "@/components/request-search";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/components/locale-provider";

export default function RequestsSearchPage() {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          {t("requests_title")}
        </h1>
        <p className="text-[var(--muted)]">{t("requests_subtitle")}</p>
      </div>

      <Card>
        <RequestSearch hideHeading plain />
      </Card>
    </div>
  );
}
