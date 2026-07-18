"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/locale-provider";
import {
  fetchSuggestedCountry,
  type DetectedCountry,
} from "@/lib/detect-country";

type Props = {
  /** Current country value (name or code). */
  value: string;
  /** Apply suggestion (profile uses country name). */
  onApply: (countryName: string, countryCode: string) => void;
  /** Only suggest when value is empty. */
  onlyIfEmpty?: boolean;
};

export function CountrySuggest({
  value,
  onApply,
  onlyIfEmpty = true,
}: Props) {
  const { t } = useI18n();
  const [suggested, setSuggested] = useState<DetectedCountry | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    if (onlyIfEmpty && value.trim()) return;
    let cancelled = false;
    setLoading(true);
    fetchSuggestedCountry()
      .then((s) => {
        if (!cancelled) setSuggested(s);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [value, onlyIfEmpty, dismissed]);

  if (dismissed) return null;
  if (loading) {
    return (
      <p className="text-xs text-[var(--muted)]">{t("country_detecting")}</p>
    );
  }
  if (!suggested) return null;
  if (onlyIfEmpty && value.trim()) return null;

  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface-2)]/50 px-3 py-2 text-sm space-y-2">
      <p>
        {t("country_suggested").replace("{name}", suggested.name)}{" "}
        <span className="text-xs text-[var(--muted)]">({suggested.code})</span>
      </p>
      <p className="text-xs text-[var(--muted)]">{t("country_detected_hint")}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => {
            onApply(suggested.name, suggested.code);
            setDismissed(true);
          }}
        >
          {t("country_use_suggested")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setDismissed(true)}
        >
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}
