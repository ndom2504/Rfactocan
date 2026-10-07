"use client";

import { ShopSearch } from "@/components/shop-search";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/components/locale-provider";

export default function ShopsSearchPage() {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          {t("shops_title")}
        </h1>
        <p className="text-[var(--muted)]">{t("shops_subtitle")}</p>
      </div>

      <Card>
        <ShopSearch hideHeading plain />
      </Card>
    </div>
  );
}
