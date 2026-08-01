"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

type Item = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export function NotificationBell({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; right: number }>({
    top: 72,
    right: 16,
  });

  async function load() {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const data = await res.json();
    setItems(data.notifications ?? []);
    setUnread(data.unread ?? 0);
  }

  useEffect(() => {
    setMounted(true);
    void load();
    const id = setInterval(() => void load(), 20000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!open) return;

    function place() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const right = Math.max(12, window.innerWidth - rect.right);
      const top = Math.min(rect.bottom + 10, window.innerHeight - 120);
      setPanelPos({ top, right });
    }

    place();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    await load();
  }

  function close() {
    setOpen(false);
  }

  const panel =
    open && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="Close"
              onClick={close}
            />
            <div
              className="absolute flex w-[min(100vw-1.5rem,24rem)] max-h-[min(70vh,28rem)] flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
              style={{ top: panelPos.top, right: panelPos.right }}
            >
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
                <p className="text-base font-semibold">
                  {t(locale, "notifications")}
                </p>
                <div className="flex items-center gap-3">
                  {unread > 0 && (
                    <button
                      type="button"
                      onClick={() => void markAllRead()}
                      className="text-xs text-[var(--accent)] underline"
                    >
                      {t(locale, "mark_all_read")}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                {items.length === 0 && (
                  <p className="py-6 text-center text-sm text-[var(--muted)]">
                    {t(locale, "no_notifications")}
                  </p>
                )}
                {items.map((n) => (
                  <div
                    key={n.id}
                    className={`rounded-lg border px-3 py-2.5 text-sm ${
                      n.readAt
                        ? "border-[var(--border)]"
                        : "border-[var(--accent)] bg-[var(--accent-soft)]/40"
                    }`}
                  >
                    {n.href ? (
                      <Link
                        href={n.href}
                        onClick={close}
                        className="font-medium hover:underline"
                      >
                        {n.title}
                      </Link>
                    ) : (
                      <p className="font-medium">{n.title}</p>
                    )}
                    <p className="mt-1 text-xs text-[var(--muted)]">{n.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void load();
        }}
        className="relative rounded-md border border-[var(--border)] px-2 py-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        aria-label={t(locale, "notifications")}
        aria-expanded={open}
      >
        🔔
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--highlight)] px-1 text-[10px] text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {panel}
    </>
  );
}
