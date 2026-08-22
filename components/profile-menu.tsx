"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/locale-provider";
import { requestTourStart } from "@/lib/guided-tour";
import { cn } from "@/lib/utils";

const MENU_WIDTH = 192;

type Props = {
  displayName: string;
  avatarUrl?: string | null;
  /** sm = header compact · lg = dashboard banner bubble */
  size?: "sm" | "lg";
  showName?: boolean;
  className?: string;
};

export function ProfileMenu({
  displayName,
  avatarUrl,
  size = "sm",
  showName,
  className,
}: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const large = size === "lg";
  const nameVisible = showName ?? !large;

  useEffect(() => {
    setMounted(true);
  }, []);

  function placeMenu() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const rawLeft = large
      ? rect.left + rect.width / 2 - MENU_WIDTH / 2
      : rect.right - MENU_WIDTH;
    const maxLeft = Math.max(8, window.innerWidth - MENU_WIDTH - 8);
    setMenuPos({
      top: rect.bottom + 8,
      left: Math.min(Math.max(8, rawLeft), maxLeft),
    });
  }

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

  useEffect(() => {
    if (!open) return;
    placeMenu();
    window.addEventListener("resize", placeMenu);
    window.addEventListener("scroll", placeMenu, true);
    return () => {
      window.removeEventListener("resize", placeMenu);
      window.removeEventListener("scroll", placeMenu, true);
    };
  }, [open, large]);

  async function logout() {
    setOpen(false);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const menu =
    open && mounted
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="fixed z-[200] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg"
            style={{
              top: menuPos.top,
              left: menuPos.left,
              width: MENU_WIDTH,
            }}
          >
            <Link
              href="/profile"
              role="menuitem"
              className="block px-3 py-2 text-sm hover:bg-[var(--surface-2)]"
              onClick={() => setOpen(false)}
            >
              {t("nav_profile")}
            </Link>
            <Link
              href="/ambassador/apply"
              role="menuitem"
              className="block px-3 py-2 text-sm hover:bg-[var(--surface-2)]"
              onClick={() => setOpen(false)}
            >
              {t("ambassador_become_cta")}
            </Link>
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)]"
              onClick={() => {
                setOpen(false);
                requestTourStart();
              }}
            >
              {t("tour_replay")}
            </button>
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-sm text-red-700 hover:bg-[var(--surface-2)]"
              onClick={() => void logout()}
            >
              {t("logout")}
            </button>
          </div>,
          document.body
        )
      : null;

  return (
    <div className={cn("relative", className)} ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          placeMenu();
          setOpen((v) => !v);
        }}
        className={cn(
          "flex items-center gap-2 rounded-full outline-none ring-[var(--accent)] focus-visible:ring-2",
          large && "flex-col gap-2"
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("nav_profile")}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className={cn(
              "rounded-full border-2 object-cover shadow-md",
              large
                ? "h-24 w-24 border-white shadow-lg ring-4 ring-white/40 sm:h-28 sm:w-28"
                : "h-8 w-8 border-[var(--border)]"
            )}
          />
        ) : (
          <span
            className={cn(
              "flex items-center justify-center rounded-full border-2 font-semibold shadow-md",
              large
                ? "h-24 w-24 border-white bg-[var(--rfacto-green)] text-2xl text-white shadow-lg ring-4 ring-white/40 sm:h-28 sm:w-28 sm:text-3xl"
                : "h-8 w-8 border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--foreground)]"
            )}
          >
            {displayName.slice(0, 1).toUpperCase()}
          </span>
        )}
        {nameVisible && (
          <span
            className={cn(
              "text-sm",
              large
                ? "font-[family-name:var(--font-display)] text-base font-semibold text-[var(--foreground)] sm:text-lg"
                : "hidden sm:inline"
            )}
          >
            {displayName}
          </span>
        )}
      </button>
      {menu}
    </div>
  );
}
