"use client";

import { parseDescription } from "@/lib/format-description";
import { LinkedText } from "@/components/linked-text";

type Props = {
  text: string | null | undefined;
  className?: string;
  /** Smaller muted cards - still formats line breaks */
  dense?: boolean;
};

/**
 * Renders shop/service descriptions with paste-friendly structure:
 * blank lines become paragraphs; dash/asterisk/bullet markers become lists;
 * "1." / "2)" lines become numbered lists.
 */
export function FormattedDescription({
  text,
  className = "",
  dense = false,
}: Props) {
  const blocks = parseDescription(text);
  if (blocks.length === 0) return null;

  const base = dense
    ? "text-left text-sm leading-relaxed text-[var(--muted)]"
    : "text-left text-sm leading-relaxed text-[var(--foreground)]";

  return (
    <div className={`${base} space-y-3 [overflow-wrap:anywhere] ${className}`.trim()}>
      {blocks.map((block, i) => {
        if (block.type === "paragraph") {
          return (
            <p key={i} className="break-words text-pretty">
              {block.lines.map((line, j) => (
                <span key={j}>
                  {j > 0 ? <br /> : null}
                  <LinkedText text={line} />
                </span>
              ))}
            </p>
          );
        }
        if (block.type === "ul") {
          return (
            <ul
              key={i}
              className="list-disc space-y-1.5 pl-5 marker:text-[var(--accent)]"
            >
              {block.items.map((item, j) => (
                <li key={j} className="pl-0.5">
                  <span className="break-words">
                    <LinkedText text={item} />
                  </span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <ol
            key={i}
            className="list-decimal space-y-1.5 pl-5 marker:text-[var(--accent)]"
          >
            {block.items.map((item, j) => (
              <li key={j} className="pl-0.5">
                <span className="break-words">
                  <LinkedText text={item} />
                </span>
              </li>
            ))}
          </ol>
        );
      })}
    </div>
  );
}
