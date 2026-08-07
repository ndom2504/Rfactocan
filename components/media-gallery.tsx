"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useI18n } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";

type Props = {
  photos: string[];
  alt?: string;
  className?: string;
  /** Max height of the main carousel viewport */
  maxHeightClass?: string;
};

/**
 * Horizontal swipe/scroll gallery for product & service photos.
 * Full image (object-contain) + optional fullscreen viewer.
 */
export function MediaGallery({
  photos,
  alt = "",
  className = "",
  maxHeightClass = "max-h-[min(70vh,32rem)]",
}: Props) {
  const { t, locale } = useI18n();
  const urls = photos.filter(Boolean);
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const lbScrollerRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const count = urls.length;
  const label =
    locale === "en"
      ? `Photo ${Math.min(index + 1, count)} of ${count}`
      : `Photo ${Math.min(index + 1, count)} sur ${count}`;

  const goTo = useCallback(
    (i: number, behavior: ScrollBehavior = "smooth") => {
      if (count === 0) return;
      const next = ((i % count) + count) % count;
      setIndex(next);
      slideRefs.current[next]?.scrollIntoView({
        behavior,
        inline: "center",
        block: "nearest",
      });
    },
    [count]
  );

  // Track active slide while user swipes
  useEffect(() => {
    const root = scrollerRef.current;
    if (!root || count <= 1) return;
    const slides = slideRefs.current.filter(Boolean) as HTMLElement[];
    if (slides.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible?.target) return;
        const i = slides.indexOf(visible.target as HTMLElement);
        if (i >= 0) setIndex(i);
      },
      { root, threshold: [0.55, 0.75] }
    );
    slides.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [count, urls.join("|")]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowRight") goTo(index + 1);
      if (e.key === "ArrowLeft") goTo(index - 1);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Align lightbox to current index
    requestAnimationFrame(() => {
      const node = lbScrollerRef.current?.children[index] as
        | HTMLElement
        | undefined;
      node?.scrollIntoView({ inline: "center", block: "nearest" });
    });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [lightbox, goTo, index]);

  if (count === 0) return null;

  const snapStyle: CSSProperties = {
    scrollSnapType: "x mandatory",
    WebkitOverflowScrolling: "touch",
  };

  return (
    <div className={className}>
      <div className="relative overflow-hidden rounded-xl bg-[var(--surface-2)]">
        <div
          ref={scrollerRef}
          className={`flex ${maxHeightClass} min-h-[14rem] w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth`}
          style={snapStyle}
          role="region"
          aria-roledescription="carousel"
          aria-label={t("media_gallery_label")}
        >
          {urls.map((url, i) => (
            <button
              key={`${url}-${i}`}
              type="button"
              ref={(el) => {
                slideRefs.current[i] = el;
              }}
              className="relative flex h-full min-h-[14rem] min-w-full w-full shrink-0 snap-center items-center justify-center border-0 bg-transparent p-0"
              style={{ scrollSnapAlign: "center" }}
              onClick={() => setLightbox(true)}
              aria-label={
                locale === "en"
                  ? `Open photo ${i + 1}`
                  : `Agrandir la photo ${i + 1}`
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={alt || label}
                className={`${maxHeightClass} max-w-full object-contain`}
                draggable={false}
              />
            </button>
          ))}
        </div>

        {count > 1 && (
          <>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/45 to-transparent px-3 pb-2.5 pt-10 text-xs font-medium text-white">
              <span className="rounded-full bg-black/40 px-2.5 py-1 backdrop-blur-sm">
                {label}
              </span>
              <span className="rounded-full bg-black/40 px-2.5 py-1 backdrop-blur-sm">
                {t("media_gallery_swipe")}
              </span>
            </div>
            <div className="absolute inset-y-0 left-0 flex items-center pl-1.5">
              <button
                type="button"
                className="rounded-full bg-black/40 px-2.5 py-1.5 text-sm text-white backdrop-blur-sm hover:bg-black/55"
                onClick={(e) => {
                  e.stopPropagation();
                  goTo(index - 1);
                }}
                aria-label={locale === "en" ? "Previous" : "Précédent"}
              >
                ‹
              </button>
            </div>
            <div className="absolute inset-y-0 right-0 flex items-center pr-1.5">
              <button
                type="button"
                className="rounded-full bg-black/40 px-2.5 py-1.5 text-sm text-white backdrop-blur-sm hover:bg-black/55"
                onClick={(e) => {
                  e.stopPropagation();
                  goTo(index + 1);
                }}
                aria-label={locale === "en" ? "Next" : "Suivant"}
              >
                ›
              </button>
            </div>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {urls.map((url, i) => (
            <button
              key={`thumb-${url}-${i}`}
              type="button"
              onClick={() => goTo(i)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 transition ${
                i === index
                  ? "border-[var(--accent)] opacity-100"
                  : "border-transparent opacity-70 hover:opacity-100"
              }`}
              aria-label={
                locale === "en" ? `Go to photo ${i + 1}` : `Photo ${i + 1}`
              }
              aria-current={i === index ? "true" : undefined}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/92"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 text-white">
            <h2 id={titleId} className="text-sm font-medium">
              {label}
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-white/30 bg-transparent text-white hover:bg-white/10"
              onClick={() => setLightbox(false)}
            >
              {t("close")}
            </Button>
          </div>
          <div
            ref={lbScrollerRef}
            className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
            style={snapStyle}
          >
            {urls.map((url, i) => (
              <div
                key={`lb-${url}-${i}`}
                className="flex h-full min-w-full w-full shrink-0 snap-center items-center justify-center px-2"
                style={{ scrollSnapAlign: "center" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={alt}
                  className="max-h-[calc(100vh-5rem)] max-w-full object-contain"
                  draggable={false}
                />
              </div>
            ))}
          </div>
          {count > 1 && (
            <p className="shrink-0 pb-4 text-center text-xs text-white/70">
              {t("media_gallery_swipe")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
