"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/locale-provider";
import { RFACTO_SLIDES, RFACTO_SLIDE_MS, rfactoSlideSrc } from "@/lib/rfacto-slides";

/** Full-viewport rotating banners behind auth forms. */
export function AuthSlidesBackdrop() {
  const { locale, t } = useI18n();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % RFACTO_SLIDES.length);
    }, RFACTO_SLIDE_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(165deg, #1b3b14 0%, #28541d 50%, #404d35 100%)",
        }}
      />
      {RFACTO_SLIDES.map((slide, i) => {
        const on = i === index;
        return (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-out ${
              on ? "opacity-100" : "opacity-0"
            }`}
          >
            <div
              className={`absolute inset-0 transition-transform duration-[6500ms] ease-out ${
                on ? "scale-105" : "scale-100"
              }`}
            >
              <Image
                src={rfactoSlideSrc(slide, locale)}
                alt=""
                fill
                priority={i === 0}
                sizes="100vw"
                className="object-cover object-center opacity-55"
              />
            </div>
          </div>
        );
      })}
      {/* Brand wash so the form stays readable */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(160deg, rgba(27,59,20,0.72) 0%, rgba(40,84,29,0.55) 45%, rgba(64,77,53,0.68) 100%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 40%, transparent 0%, rgba(27,59,20,0.55) 100%)",
        }}
      />
      {/* Decorative gold accent line */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[var(--rfacto-gold)] to-transparent opacity-80" />
      <span className="sr-only">{t(RFACTO_SLIDES[index]!.altKey)}</span>
    </div>
  );
}
