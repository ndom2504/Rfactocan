"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Locale } from "@/lib/i18n";

export function LocaleToggle({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setLocale(next: Locale) {
    if (next === locale) return;
    startTransition(async () => {
      await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      });
      router.refresh();
    });
  }

  return (
    <div className="flex overflow-hidden rounded-md border border-[var(--border)] text-xs">
      <button
        type="button"
        disabled={pending}
        onClick={() => setLocale("fr")}
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
        onClick={() => setLocale("en")}
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
