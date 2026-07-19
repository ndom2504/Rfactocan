"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";

const PUBLISH_LINKS = [
  { href: "/trips/new", labelKey: "publish_trip_cta" as const },
  { href: "/services/new", labelKey: "publish_service_cta" as const },
  { href: "/requests/new", labelKey: "publish_order_cta" as const },
];

export function PublishMenu() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="relative" ref={rootRef}>
      <Button
        type="button"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {t("nav_publish")}
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg"
        >
          {PUBLISH_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              className="block px-3 py-2.5 text-sm hover:bg-[var(--surface-2)]"
              onClick={() => setOpen(false)}
            >
              {t(item.labelKey)}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
