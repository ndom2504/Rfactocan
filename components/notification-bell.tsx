"use client";

import { useEffect, useState } from "react";
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

  async function load() {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const data = await res.json();
    setItems(data.notifications ?? []);
    setUnread(data.unread ?? 0);
  }

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 20000);
    return () => clearInterval(id);
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    await load();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void load();
        }}
        className="relative rounded-md border border-[var(--border)] px-2 py-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        aria-label={t(locale, "notifications")}
      >
        🔔
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--highlight)] px-1 text-[10px] text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">{t(locale, "notifications")}</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-xs text-[var(--accent)] underline"
              >
                {t(locale, "mark_all_read")}
              </button>
            )}
          </div>
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {items.length === 0 && (
              <p className="text-xs text-[var(--muted)]">
                {t(locale, "no_notifications")}
              </p>
            )}
            {items.map((n) => (
              <div
                key={n.id}
                className={`rounded-md border px-2 py-2 text-xs ${
                  n.readAt
                    ? "border-[var(--border)]"
                    : "border-[var(--accent)] bg-[var(--accent-soft)]/40"
                }`}
              >
                {n.href ? (
                  <Link
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className="font-medium hover:underline"
                  >
                    {n.title}
                  </Link>
                ) : (
                  <p className="font-medium">{n.title}</p>
                )}
                <p className="mt-0.5 text-[var(--muted)]">{n.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
