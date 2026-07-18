"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/locale-provider";

export function HomeVisionButton() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="border-white/45 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
        onClick={() => setOpen(true)}
      >
        Rfacto
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id={titleId}
              className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--accent)]"
            >
              {t("vision_title")}
            </h2>
            <p className="mt-3 text-[var(--muted)]">{t("vision_lead")}</p>
            <ul className="mt-5 space-y-3 text-sm leading-relaxed text-[var(--foreground)]">
              <li>
                <span className="font-semibold text-[var(--accent)]">
                  {t("vision_actor_travelers")}
                </span>
                {" — "}
                {t("vision_actor_travelers_text")}
              </li>
              <li>
                <span className="font-semibold text-[var(--accent)]">
                  {t("vision_actor_business")}
                </span>
                {" — "}
                {t("vision_actor_business_text")}
              </li>
              <li>
                <span className="font-semibold text-[var(--accent)]">
                  {t("vision_actor_clients")}
                </span>
                {" — "}
                {t("vision_actor_clients_text")}
              </li>
            </ul>
            <p className="mt-5 text-sm text-[var(--muted)]">{t("vision_goal")}</p>
            <div className="mt-6 flex justify-end">
              <Button type="button" onClick={() => setOpen(false)}>
                {t("close")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
