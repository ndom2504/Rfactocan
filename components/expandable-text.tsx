"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/components/locale-provider";
import { FormattedDescription } from "@/components/formatted-description";

type Props = {
  text: string;
  /** Soft cap (characters) before "read more" appears */
  maxChars?: number;
  /** Soft cap (lines) — applied via CSS when collapsed */
  maxLines?: number;
  className?: string;
};

/**
 * Truncates long community announcement text with "Lire tout" / "Réduire".
 * Paragraphs wrap, align, and URLs/emails become clickable.
 */
export function ExpandableText({
  text,
  maxChars = 320,
  maxLines = 5,
  className = "",
}: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const plain = text ?? "";
  const needsToggle = useMemo(() => {
    const lines = plain.split(/\r?\n/).length;
    return plain.trim().length > maxChars || lines > maxLines;
  }, [plain, maxChars, maxLines]);

  if (!plain.trim()) return null;

  return (
    <div className={className}>
      <div
        className={
          !open && needsToggle ? "line-clamp-5 overflow-hidden" : undefined
        }
      >
        <FormattedDescription text={plain} />
      </div>
      {needsToggle && (
        <button
          type="button"
          className="mt-1 text-sm font-medium text-[var(--accent)] hover:underline"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? t("community_read_less") : t("community_read_more")}
        </button>
      )}
    </div>
  );
}
