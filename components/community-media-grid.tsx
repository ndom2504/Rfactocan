"use client";

import {
  isImageAttachment,
  type CommunityAttachment,
} from "@/lib/community";

/** X-style media: full width, natural height (no crop). */
export function CommunityMediaGrid({
  attachments,
  postId,
}: {
  attachments: CommunityAttachment[];
  postId: string;
}) {
  if (!attachments.length) return null;

  const images = attachments.filter((a) => isImageAttachment(a.contentType));
  const files = attachments.filter((a) => !isImageAttachment(a.contentType));

  return (
    <div className="space-y-2">
      {images.length === 1 && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={images[0].url}
          alt={images[0].name}
          className="block h-auto w-full"
        />
      )}
      {images.length === 2 && (
        <div className="grid grid-cols-2 gap-0.5 overflow-hidden rounded-lg bg-[var(--surface-2)]">
          {images.map((a, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${postId}-img-${i}`}
              src={a.url}
              alt={a.name}
              className="h-auto w-full object-contain"
            />
          ))}
        </div>
      )}
      {images.length >= 3 && (
        <div className="flex flex-col gap-0.5 overflow-hidden rounded-lg bg-[var(--surface-2)]">
          {images.slice(0, 3).map((a, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${postId}-img-${i}`}
              src={a.url}
              alt={a.name}
              className="block h-auto w-full"
            />
          ))}
        </div>
      )}
      {files.map((a, i) => (
        <a
          key={`${postId}-file-${i}`}
          href={a.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mx-3 flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--accent)] hover:bg-[var(--surface-2)] sm:mx-0"
        >
          PDF · {a.name}
        </a>
      ))}
    </div>
  );
}
