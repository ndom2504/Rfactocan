"use client";

import { useI18n } from "@/components/locale-provider";
import { cn } from "@/lib/utils";

/** WhatsApp-style video bubble: first frame via poster + play overlay. */
export function DmVideoPreview({
  url,
  mine,
}: {
  url: string;
  mine?: boolean;
}) {
  const { t } = useI18n();
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="relative block overflow-hidden rounded-lg bg-[#0B1F0A]"
    >
      <video
        src={url}
        muted
        playsInline
        preload="metadata"
        className="max-h-52 w-full object-cover"
      />
      <span
        className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25"
        aria-hidden
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-2xl text-white">
          ▶
        </span>
      </span>
      <span
        className={cn(
          "pointer-events-none absolute bottom-2 left-2 text-[11px] font-bold text-white drop-shadow"
        )}
      >
        {t("call_video")}
      </span>
    </a>
  );
}
