"use client";

import { useEffect, useId } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/locale-provider";

type Props = {
  open: boolean;
  title: string;
  body: string;
  continueLabel?: string;
  onContinue: () => void;
};

/** Post-create reminder: add images to get better promotion. */
export function PromoImagesDialog({
  open,
  title,
  body,
  continueLabel,
  onContinue,
}: Props) {
  const { t } = useI18n();
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onContinue();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onContinue]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="presentation"
      onClick={onContinue}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id={titleId}
          className="font-[family-name:var(--font-display)] text-lg font-semibold"
        >
          {title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{body}</p>
        <div className="mt-5 flex justify-end">
          <Button type="button" onClick={onContinue}>
            {continueLabel ?? t("promo_images_continue")}
          </Button>
        </div>
      </div>
    </div>
  );
}
