"use client";

import {
  useEffect,
  useRef,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { Forward, Share2, Trash2 } from "lucide-react";
import { DM_REACTION_EMOJIS, type ReactionSummary } from "@/lib/dm-reactions";
import { cn } from "@/lib/utils";

export function useMessageLongPress(onOpen: () => void, ms = 450) {
  const timerRef = useRef<number | null>(null);
  const openedRef = useRef(false);

  const clear = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => () => clear(), []);

  return {
    onPointerDown: (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("button, audio")) return;
      if (
        target?.closest("a") &&
        !target.closest("[data-dm-attachment]")
      ) {
        return;
      }
      openedRef.current = false;
      clear();
      timerRef.current = window.setTimeout(() => {
        openedRef.current = true;
        onOpen();
      }, ms);
    },
    onPointerUp: clear,
    onPointerCancel: clear,
    onPointerLeave: clear,
    onContextMenu: (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("button, audio")) return;
      if (
        target?.closest("a") &&
        !target.closest("[data-dm-attachment]")
      ) {
        return;
      }
      e.preventDefault();
      openedRef.current = true;
      onOpen();
    },
    onClickCapture: (e: MouseEvent) => {
      if (!openedRef.current) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("button, audio")) {
        openedRef.current = false;
        return;
      }
      if (
        target?.closest("a") &&
        !target.closest("[data-dm-attachment]")
      ) {
        openedRef.current = false;
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      openedRef.current = false;
    },
  };
}

function pickEmoji(
  e: { preventDefault: () => void; stopPropagation: () => void },
  emoji: string,
  onPick: (emoji: string) => void
) {
  e.preventDefault();
  e.stopPropagation();
  onPick(emoji);
}

export function ReactionPicker({
  onPick,
  onShare,
  onForward,
  onDelete,
  shareLabel,
  forwardLabel,
  deleteLabel,
  alignEnd,
}: {
  onPick: (emoji: string) => void;
  onShare?: () => void;
  onForward?: () => void;
  onDelete?: () => void;
  shareLabel?: string;
  forwardLabel?: string;
  deleteLabel?: string;
  alignEnd?: boolean;
}) {
  return (
    <div
      data-dm-react-picker
      className={cn(
        "absolute bottom-full z-30 mb-1 flex max-w-[min(100vw-2rem,22rem)] flex-wrap items-center gap-0.5 rounded-full border border-black/10 bg-white px-1.5 py-1 shadow-lg",
        alignEnd ? "right-0" : "left-0"
      )}
      role="listbox"
      aria-label="Réactions"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {DM_REACTION_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full text-xl leading-none transition hover:scale-125 hover:bg-black/5"
          onPointerDown={(e) => pickEmoji(e, emoji, onPick)}
        >
          {emoji}
        </button>
      ))}
      {(onShare || onForward || onDelete) && (
        <span className="mx-0.5 h-6 w-px bg-black/10" aria-hidden />
      )}
      {onShare && (
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-black/5 hover:text-[var(--foreground)]"
          title={shareLabel}
          aria-label={shareLabel}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onShare();
          }}
        >
          <Share2 className="h-4 w-4" />
        </button>
      )}
      {onForward && (
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-black/5 hover:text-[var(--foreground)]"
          title={forwardLabel}
          aria-label={forwardLabel}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onForward();
          }}
        >
          <Forward className="h-4 w-4" />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full text-red-600 transition hover:bg-red-50"
          title={deleteLabel}
          aria-label={deleteLabel}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function ReactionChips({
  reactions,
  onToggle,
  mineBubble,
}: {
  reactions: ReactionSummary[];
  onToggle: (emoji: string) => void;
  mineBubble?: boolean;
}) {
  if (reactions.length === 0) return null;
  return (
    <div
      className={cn(
        "z-10 -mt-2 flex flex-wrap gap-1",
        mineBubble ? "justify-end pr-1" : "justify-start pl-1"
      )}
    >
      {reactions.map((r) => (
        <button
          key={r.emoji}
          type="button"
          onPointerDown={(e) => pickEmoji(e, r.emoji, onToggle)}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] leading-none shadow-sm",
            r.mine
              ? "border-[var(--accent)] bg-white text-[var(--foreground)]"
              : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
          )}
        >
          <span>{r.emoji}</span>
          {r.count > 1 && <span className="tabular-nums">{r.count}</span>}
        </button>
      ))}
    </div>
  );
}
