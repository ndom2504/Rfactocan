"use client";

import { useState } from "react";
import { TravelerSearch } from "@/components/traveler-search";
import { RequestSearch } from "@/components/request-search";
import { ServiceSearch } from "@/components/service-search";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useI18n } from "@/components/locale-provider";

export type SearchMode = "voyageurs" | "colis" | "services";

type Props = {
  /** Kept for compatibility — all marketplace modes are available. */
  canSearchLivreurs?: boolean;
  canSearchCommandes?: boolean;
};

export function DashboardSearchHub(_props: Props) {
  const { t } = useI18n();
  const [mode, setMode] = useState<SearchMode>("voyageurs");

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          {t("dashboard_search_title")}
        </h2>
        <p className="text-sm text-[var(--muted)]">
          {t("dashboard_search_hint")}
        </p>
      </div>

      <Card className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="search-mode">{t("search_filter_type")}</Label>
          <Select
            id="search-mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as SearchMode)}
          >
            <option value="voyageurs">{t("publish_transport_cta")}</option>
            <option value="colis">{t("publish_ship_cta")}</option>
            <option value="services">{t("publish_listing_cta")}</option>
          </Select>
        </div>

        {mode === "voyageurs" && <TravelerSearch hideHeading plain />}
        {mode === "colis" && <RequestSearch hideHeading plain />}
        {mode === "services" && <ServiceSearch hideHeading plain />}
      </Card>
    </section>
  );
}
