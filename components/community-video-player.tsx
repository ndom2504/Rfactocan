"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  className?: string;
  /** Composer thumbnail mode — no autoplay, compact height. */
  compact?: boolean;
};

/**
 * Facebook-style community feed video:
 * - object-fit contain + height cap so desktop doesn't stretch/blur frames
 * - muted loop preview while mostly in the viewport
 * - tap for sound + native controls
 */
export function CommunityVideoPlayer({
  src,
  className = "",
  compact = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [inView, setInView] = useState(false);
  const [userPlaying, setUserPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || compact) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting && entry.intersectionRatio >= 0.4);
      },
      { threshold: [0, 0.25, 0.4, 0.55, 0.75, 1], rootMargin: "0px 0px -10% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [compact, src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || compact) return;

    video.playsInline = true;
    video.muted = muted;

    if (inView) {
      void video.play().catch(() => {
        /* autoplay blocked */
      });
    } else {
      video.pause();
      if (!userPlaying) {
        try {
          video.currentTime = 0;
        } catch {
          /* ignore */
        }
      }
    }
  }, [inView, muted, compact, userPlaying, src]);

  const shellClass = compact
    ? "max-h-40 min-h-[5rem]"
    : "min-h-[12rem] max-h-[min(70vh,480px)] sm:max-h-[min(65vh,440px)] md:max-h-[400px] lg:max-h-[460px]";

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden bg-black ${className}`}
    >
      <div
        className={`mx-auto flex w-full items-center justify-center bg-black ${shellClass}`}
      >
        <video
          ref={videoRef}
          src={src}
          playsInline
          muted={muted}
          loop={!userPlaying}
          controls={userPlaying || compact}
          preload="metadata"
          // Contain keeps native aspect inside the adaptive window (no stretch).
          className={`block h-auto max-h-[inherit] w-auto max-w-full object-contain ${shellClass}`}
          onLoadedMetadata={() => {
            const video = videoRef.current;
            if (!video || compact || !inView) return;
            video.muted = muted;
            void video.play().catch(() => undefined);
          }}
          onClick={() => {
            if (compact) return;
            setUserPlaying(true);
            setMuted(false);
            const v = videoRef.current;
            if (v) {
              v.muted = false;
              void v.play().catch(() => undefined);
            }
          }}
        />
      </div>

      {!compact && !userPlaying && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rounded-full bg-black/55 px-4 py-2 text-xs font-semibold tracking-wide text-white shadow-lg backdrop-blur-sm">
            ▶ Aperçu
          </span>
        </div>
      )}

      {!compact && inView && (
        <button
          type="button"
          className="absolute bottom-3 right-3 z-10 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white hover:bg-black/85"
          onClick={(e) => {
            e.stopPropagation();
            setMuted((m) => {
              const next = !m;
              if (!next) setUserPlaying(true);
              const v = videoRef.current;
              if (v) v.muted = next;
              return next;
            });
          }}
          aria-label={muted ? "Activer le son" : "Couper le son"}
        >
          {muted ? "🔇" : "🔊"}
        </button>
      )}
    </div>
  );
}
