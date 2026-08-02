"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { getWhatsAppCommunityUrl } from "@/lib/whatsapp-community";
import { RFACTO_SLIDES, RFACTO_SLIDE_MS } from "@/lib/rfacto-slides";

const SLIDES = RFACTO_SLIDES.map((s) => ({
  ...s,
  labelKey: "home_slide_communaute" as const,
}));

const SLIDE_MS = RFACTO_SLIDE_MS;

type Props = {
  startHref: string;
};

export function HomeHeroCarousel({ startHref }: Props) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [tick, setTick] = useState(0);
  const whatsapp = getWhatsAppCommunityUrl();

  const go = useCallback((next: number) => {
    setIndex(((next % SLIDES.length) + SLIDES.length) % SLIDES.length);
    setTick(0);
  }, []);

  useEffect(() => {
    if (paused || SLIDES.length <= 1) return;
    const started = Date.now();
    setTick(0);
    const id = window.setInterval(() => {
      const elapsed = Date.now() - started;
      if (elapsed >= SLIDE_MS) {
        setIndex((i) => (i + 1) % SLIDES.length);
        return;
      }
      setTick(elapsed);
    }, 50);
    return () => window.clearInterval(id);
  }, [paused, index]);

  useEffect(() => {
    if (SLIDES.length <= 1) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index]);

  const progress = Math.min(1, tick / SLIDE_MS);
  const active = SLIDES[index]!;
  const adHref = whatsapp;

  return (
    <section
      className="relative isolate overflow-hidden rounded-none bg-[var(--hero-from)] md:rounded-b-[2rem]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label={t("home_carousel_label")}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 70% 40%, rgba(93,132,67,0.45), transparent 70%), linear-gradient(165deg, #1b3b14 0%, #28541d 55%, #404d35 100%)",
        }}
      />

      <div className="relative mx-auto flex min-h-[min(92vh,920px)] w-full max-w-[1400px] flex-col">
        {SLIDES.length > 1 ? (
          <div className="absolute inset-x-0 top-0 z-20 flex gap-1.5 px-4 pt-3 sm:px-6 sm:pt-4">
            {SLIDES.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                aria-label={t(slide.labelKey)}
                aria-current={i === index}
                onClick={() => go(i)}
                className="group h-1.5 flex-1 overflow-hidden rounded-full bg-white/25 transition hover:bg-white/35"
              >
                <span
                  className="block h-full origin-left rounded-full bg-white transition-[width] duration-75 ease-linear"
                  style={{
                    width:
                      i < index
                        ? "100%"
                        : i === index
                          ? `${progress * 100}%`
                          : "0%",
                  }}
                />
              </button>
            ))}
          </div>
        ) : null}

        <div className="relative flex-1">
          {SLIDES.map((slide, i) => {
            const on = i === index;
            const image = (
              <div
                className={`absolute inset-0 transition-transform duration-[6500ms] ease-out ${
                  on ? "scale-[1.04]" : "scale-100"
                }`}
              >
                <Image
                  src={slide.src}
                  alt={t(slide.altKey)}
                  fill
                  priority={i === 0}
                  sizes="(max-width: 768px) 100vw, 1400px"
                  className="object-contain object-center md:object-cover md:object-[center_20%]"
                />
              </div>
            );
            return (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-opacity duration-700 ease-out ${
                  on ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
                aria-hidden={!on}
              >
                {adHref && on ? (
                  <a
                    href={adHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 block"
                    aria-label={t("cta_join_whatsapp")}
                  >
                    {image}
                  </a>
                ) : (
                  image
                )}
              </div>
            );
          })}

          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[rgba(27,59,20,0.94)] via-[rgba(27,59,20,0.4)] to-transparent"
            aria-hidden
          />
        </div>

        <div className="relative z-20 mx-auto w-full max-w-3xl px-4 pb-6 pt-2 sm:px-6 sm:pb-8">
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-md sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/65">
                  {t("home_carousel_now")}
                </p>
                <p className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold text-white sm:text-xl">
                  {t(active.labelKey)}
                </p>
              </div>
              {SLIDES.length > 1 ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => go(index - 1)}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition hover:bg-white/20"
                    aria-label={t("home_carousel_prev")}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => go(index + 1)}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition hover:bg-white/20"
                    aria-label={t("home_carousel_next")}
                  >
                    ›
                  </button>
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Link href={startHref} className="sm:flex-1">
                <Button
                  size="lg"
                  className="h-12 w-full bg-white text-base font-semibold !text-[var(--rfacto-green-dark)] shadow-lg shadow-black/20 hover:bg-white/90 hover:!text-[var(--rfacto-green-dark)]"
                >
                  {t("cta_start_here")}
                </Button>
              </Link>
              {whatsapp ? (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sm:flex-1"
                >
                  <Button
                    size="lg"
                    className="h-12 w-full bg-[#25D366] text-sm font-semibold text-white hover:bg-[#1ebe57]"
                  >
                    {t("cta_join_whatsapp")}
                  </Button>
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
