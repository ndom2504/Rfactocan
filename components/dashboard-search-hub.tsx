"use client";

import { useMemo, useState } from "react";
import { TravelerSearch } from "@/components/traveler-search";
import { RequestSearch } from "@/components/request-search";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/locale-provider";
import { cn } from "@/lib/utils";

type SearchMode = "livreurs" | "commandes";

type Props = {
  canSearchLivreurs: boolean;
  canSearchCommandes: boolean;
};

export function DashboardSearchHub({
  canSearchLivreurs,
  canSearchCommandes,
}: Props) {
  const { t } = useI18n();
  const defaultMode = useMemo<SearchMode>(() => {
    if (canSearchLivreurs) return "livreurs";
    if (canSearchCommandes) return "commandes";
    return "livreurs";
  }, [canSearchLivreurs, canSearchCommandes]);
  const [mode, setMode] = useState<SearchMode>(defaultMode);

  if (!canSearchLivreurs && !canSearchCommandes) return null;

  const active: SearchMode =
    mode === "livreurs" && !canSearchLivreurs
      ? "commandes"
      : mode === "commandes" && !canSearchCommandes
        ? "livreurs"
        : mode;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          {t("dashboard_search_title")}
        </h2>
        <p className="text-sm text-[var(--muted)]">
          {t("dashboard_search_hint")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {canSearchLivreurs && (
          <Button
            type="button"
            size="sm"
            variant={active === "livreurs" ? "default" : "outline"}
            className={cn(active === "livreurs" && "pointer-events-none")}
            onClick={() => setMode("livreurs")}
          >
            {t("search_mode_livreurs")}
          </Button>
        )}
        {canSearchCommandes && (
          <Button
            type="button"
            size="sm"
            variant={active === "commandes" ? "default" : "outline"}
            className={cn(active === "commandes" && "pointer-events-none")}
            onClick={() => setMode("commandes")}
          >
            {t("search_mode_commandes")}
          </Button>
        )}
      </div>

      {active === "livreurs" ? (
        <TravelerSearch hideHeading />
      ) : (
        <RequestSearch hideHeading />
      )}
    </section>
  );
}
