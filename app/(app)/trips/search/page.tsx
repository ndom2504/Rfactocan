"use client";

import { TravelerSearch } from "@/components/traveler-search";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/components/locale-provider";

export default function TripsSearchPage() {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          {t("trips_title")}
        </h1>
        <p className="text-[var(--muted)]">{t("trips_subtitle")}</p>
      </div>

      <Card>
        <TravelerSearch hideHeading plain />
      </Card>
    </div>
  );
}
