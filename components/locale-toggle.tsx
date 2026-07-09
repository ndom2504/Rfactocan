"use client";

import { useTransition } from "react";
import type { Locale } from "@/lib/i18n";
import { useI18n } from "@/components/locale-provider";

export function LocaleToggle({ locale }: { locale: Locale }) {
  const { setLocale } = useI18n();
  const [pending, startTransition] = useTransition();

  function changeLocale(next: Locale) {
    if (next === locale) return;
    startTransition(() => {
      void setLocale(next);
    });
  }

  return (
    <div className="flex overflow-hidden rounded-md border border-[var(--border)] text-xs">
      <button
        type="button"
        disabled={pending}
        onClick={() => changeLocale("fr")}
        className={`px-2 py-1 ${
          locale === "fr"
            ? "bg-[var(--accent)] text-white"
            : "bg-[var(--surface)] text-[var(--muted)]"
        }`}
      >
        FR
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => changeLocale("en")}
        className={`px-2 py-1 ${
          locale === "en"
            ? "bg-[var(--accent)] text-white"
            : "bg-[var(--surface)] text-[var(--muted)]"
        }`}
      >
        EN
      </button>
    </div>
  );
}
