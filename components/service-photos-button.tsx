"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/locale-provider";

type Props = {
  photos: string[];
  className?: string;
};

export function ServicePhotosButton({ photos, className }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const count = photos?.length ?? 0;

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

  if (count === 0) return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={className}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        {t("view_photos")} ({count})
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h2
                id={titleId}
                className="font-[family-name:var(--font-display)] text-lg font-semibold"
              >
                {t("view_photos")}
              </h2>
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                {t("close")}
              </Button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {photos.map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={url}
                  src={url}
                  alt=""
                  className="h-48 w-full rounded-lg object-cover"
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
