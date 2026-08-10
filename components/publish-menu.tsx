"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";

const PUBLISH_LINKS = [
  { href: "/community", labelKey: "community_publish" as const },
  { href: "/trips/new", labelKey: "publish_trip_cta" as const },
  { href: "/services/new", labelKey: "publish_service_cta" as const },
  { href: "/shops/new", labelKey: "publish_shop_cta" as const },
  { href: "/requests/new", labelKey: "publish_order_cta" as const },
];

export function PublishMenu() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuTop, setMenuTop] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
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

  function placeMenu() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) setMenuTop(rect.bottom + 8);
  }

  useEffect(() => {
    if (!open) return;
    placeMenu();
    window.addEventListener("resize", placeMenu);
    window.addEventListener("scroll", placeMenu, true);
    return () => {
      window.removeEventListener("resize", placeMenu);
      window.removeEventListener("scroll", placeMenu, true);
    };
  }, [open]);

  const menu =
    open && mounted
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="fixed left-1/2 z-[150] w-[min(16rem,calc(100vw-1.5rem))] -translate-x-1/2 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg"
            style={{ top: menuTop }}
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
          </div>,
          document.body
        )
      : null;

  return (
    <div className="relative" ref={rootRef}>
      <Button
        ref={buttonRef}
        type="button"
        size="sm"
        onClick={() => {
          placeMenu();
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {t("nav_publish")}
      </Button>
      {menu}
    </div>
  );
}
