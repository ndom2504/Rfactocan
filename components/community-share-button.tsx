"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/locale-provider";

type Props = {
  url: string;
  title?: string | null;
  body?: string | null;
  className?: string;
};

function shareText(title: string | null | undefined, body: string | null | undefined, url: string) {
  const head = title?.trim() || "Rfacto";
  const excerpt = (body ?? "").trim().slice(0, 180);
  return excerpt ? `${head}\n\n${excerpt}\n\n${url}` : `${head}\n\n${url}`;
}

export function CommunityShareButton({ url, title, body, className }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCanNativeShare(
      typeof navigator !== "undefined" && typeof navigator.share === "function"
    );
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const text = shareText(title, body, url);
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);

  async function onShareClick() {
    if (canNativeShare) {
      try {
        await navigator.share({
          title: title?.trim() || "Rfacto",
          text: shareText(title, body, ""),
          url,
        });
        return;
      } catch {
        /* user cancelled or unsupported — fall through to menu */
      }
    }
    setOpen((v) => !v);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setOpen(true);
    }
  }

  const targets = [
    {
      id: "whatsapp",
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodedText}`,
    },
    {
      id: "facebook",
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      id: "x",
      label: "X",
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodeURIComponent(title?.trim() || "Rfacto")}`,
    },
    {
      id: "linkedin",
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      id: "telegram",
      label: "Telegram",
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(title?.trim() || "Rfacto")}`,
    },
  ];

  return (
    <div ref={rootRef} className={`relative inline-block ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => void onShareClick()}
        className="rounded-md px-3 py-1.5 text-xs font-medium text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
      >
        {t("community_share")}
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-40 mb-1 min-w-[11rem] rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg">
          {targets.map((target) => (
            <a
              key={target.id}
              href={target.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-xs hover:bg-[var(--surface-2)]"
            >
              {target.label}
            </a>
          ))}
          <button
            type="button"
            onClick={() => void copyLink()}
            className="block w-full px-3 py-2 text-left text-xs hover:bg-[var(--surface-2)]"
          >
            {copied ? t("community_share_copied") : t("community_share_copy")}
          </button>
        </div>
      )}
    </div>
  );
}

export function absoluteShareUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  if (typeof window === "undefined") return pathOrUrl;
  return new URL(pathOrUrl, window.location.origin).toString();
}
