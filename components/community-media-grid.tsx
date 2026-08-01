"use client";

import {
  isImageAttachment,
  type CommunityAttachment,
} from "@/lib/community";

/** Facebook-style media: full-width single image, grid for 2–3. */
export function CommunityMediaGrid({
  attachments,
  postId,
  maxHeightClass = "max-h-[520px]",
}: {
  attachments: CommunityAttachment[];
  postId: string;
  maxHeightClass?: string;
}) {
  if (!attachments.length) return null;

  const images = attachments.filter((a) => isImageAttachment(a.contentType));
  const files = attachments.filter((a) => !isImageAttachment(a.contentType));

  return (
    <div className="space-y-2">
      {images.length === 1 && (
        <div className="overflow-hidden bg-[var(--surface-2)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[0].url}
            alt={images[0].name}
            className={`block w-full ${maxHeightClass} object-cover object-center`}
          />
        </div>
      )}
      {images.length === 2 && (
        <div className="grid grid-cols-2 gap-0.5 overflow-hidden bg-[var(--surface-2)]">
          {images.map((a, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${postId}-img-${i}`}
              src={a.url}
              alt={a.name}
              className="aspect-square h-full w-full object-cover"
            />
          ))}
        </div>
      )}
      {images.length >= 3 && (
        <div className="grid grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden bg-[var(--surface-2)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[0].url}
            alt={images[0].name}
            className="row-span-2 h-full min-h-[220px] w-full object-cover"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[1].url}
            alt={images[1].name}
            className="h-full min-h-[110px] w-full object-cover"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[2].url}
            alt={images[2].name}
            className="h-full min-h-[110px] w-full object-cover"
          />
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
