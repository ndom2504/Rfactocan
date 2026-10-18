"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChevronsLeftRight, Package } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

function PhoneShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[1.7rem] border-[5px] border-white bg-[#0b2548] shadow-[0_18px_40px_rgba(11,61,140,0.28)] ${className}`}
    >
      <div className="absolute inset-x-[28%] top-1.5 z-10 h-1.5 rounded-full bg-black/35" />
      {children}
    </div>
  );
}

function PreviewPhoneTrack({ locale }: { locale: Locale }) {
  return (
    <PhoneShell className="h-full w-full bg-white">
      <div className="h-full bg-[#f3f7fb] px-3 pt-6 text-[10px] text-[#1f3b6d]">
        <p className="font-semibold">{t(locale, "dashboard_preview_track")}</p>
        <p className="mt-1 font-bold text-[#0b3d8c]">RF2026-4587</p>
        <p className="mt-0.5 text-[9px] text-emerald-600">
          {t(locale, "dashboard_preview_in_delivery")}
        </p>
        <div className="mt-3 space-y-2">
          {(
            [
              "dash_preview_step_shipped",
              "dash_preview_step_transit",
              "dash_preview_step_delivery",
            ] as const
          ).map((key) => (
            <div key={key} className="rounded-md bg-white px-2 py-1.5 shadow-sm">
              <p className="text-[9px] font-semibold leading-tight">
                {t(locale, key)}
              </p>
              <div className="mt-1.5 h-1 w-full rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    </PhoneShell>
  );
}

function PreviewPhoneHome({ tagline }: { tagline: string }) {
  const lines = tagline.split(". ").map((part) => part.replace(/\.$/, ""));
  return (
    <PhoneShell className="h-full w-full">
      <div className="flex h-full flex-col bg-gradient-to-b from-[#0b4db8] to-[#0b3d8c] px-3 pt-8 text-center text-white">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-white">
          <Image
            src="/logo-rfacto.webp"
            alt=""
            width={36}
            height={36}
            className="h-8 w-8 object-contain"
          />
        </div>
        <p className="mt-2 text-lg font-bold">Rfacto</p>
        <p className="mt-1 text-[11px] leading-tight text-white/90">
          {lines.map((line) => (
            <span key={line} className="block">
              {line}.
            </span>
          ))}
        </p>
        <div className="mt-auto grid grid-cols-2 gap-1.5 pb-4 text-[8px]">
          <div className="rounded bg-white/15 py-1.5">Colis</div>
          <div className="rounded bg-white/15 py-1.5">Services</div>
          <div className="rounded bg-white/15 py-1.5">Boutiques</div>
          <div className="rounded bg-white/15 py-1.5">Réseau</div>
        </div>
      </div>
    </PhoneShell>
  );
}

function PreviewPhoneServices({ locale }: { locale: Locale }) {
  return (
    <PhoneShell className="h-full w-full bg-white">
      <div className="h-full bg-white px-3 pt-6 text-[10px]">
        <p className="font-semibold text-[#0b3d8c]">{t(locale, "nav_services")}</p>
        <div className="mt-3 space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-md bg-[#f3f7fb] px-2 py-1.5"
            >
              <Package className="h-3.5 w-3.5 text-[#0b3d8c]" />
              <div className="flex-1">
                <div className="h-1.5 w-14 rounded bg-[#0b3d8c]/40" />
                <div className="mt-1.5 h-1 w-10 rounded bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PhoneShell>
  );
}

function PreviewPhoneShops({ locale }: { locale: Locale }) {
  return (
    <PhoneShell className="h-full w-full bg-white">
      <div className="h-full bg-white px-3 pt-6 text-[10px]">
        <p className="font-semibold text-[#0b3d8c]">{t(locale, "shops_title")}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="aspect-square rounded-md bg-gradient-to-br from-slate-100 to-slate-200"
            />
          ))}
        </div>
      </div>
    </PhoneShell>
  );
}

type Props = {
  locale: Locale;
  tagline: string;
};

export function DashboardPreviewPhones({ locale, tagline }: Props) {
  const slides = [
    {
      key: "track",
      node: <PreviewPhoneTrack locale={locale} />,
    },
    {
      key: "home",
      node: <PreviewPhoneHome tagline={tagline} />,
    },
    {
      key: "services",
      node: <PreviewPhoneServices locale={locale} />,
    },
    {
      key: "shops",
      node: <PreviewPhoneShops locale={locale} />,
    },
  ];

  const scrollerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const indexRef = useRef(0);
  const pausedUntilRef = useRef(0);
  const [index, setIndex] = useState(0);

  const goTo = useCallback((next: number) => {
    const clamped = (next + slides.length) % slides.length;
    const item = itemRefs.current[clamped];
    const scroller = scrollerRef.current;
    indexRef.current = clamped;
    setIndex(clamped);
    if (!item || !scroller) return;
    const left = item.offsetLeft - (scroller.clientWidth - item.offsetWidth) / 2;
    scroller.scrollTo({ left, behavior: "smooth" });
  }, [slides.length]);

  const pauseAuto = useCallback(() => {
    pausedUntilRef.current = Date.now() + 6000;
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const onScroll = () => {
      const mid = el.scrollLeft + el.clientWidth / 2;
      let closest = 0;
      let best = Number.POSITIVE_INFINITY;
      itemRefs.current.forEach((item, i) => {
        if (!item) return;
        const center = item.offsetLeft + item.offsetWidth / 2;
        const dist = Math.abs(center - mid);
        if (dist < best) {
          best = dist;
          closest = i;
        }
      });
      if (closest !== indexRef.current) {
        indexRef.current = closest;
        setIndex(closest);
      }
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (Date.now() < pausedUntilRef.current) return;
      if (window.matchMedia("(min-width: 1024px)").matches) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      goTo(indexRef.current + 1);
    }, 3200);
    return () => window.clearInterval(id);
  }, [goTo]);

  return (
    <>
      <div className="lg:hidden">
        <p className="mb-3 flex items-center justify-center gap-1.5 text-xs text-[#6b7280]">
          <ChevronsLeftRight className="h-3.5 w-3.5" aria-hidden />
          {t(locale, "dashboard_preview_swipe")}
        </p>
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-white to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-white to-transparent"
          />
          <div
            ref={scrollerRef}
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto overflow-y-hidden scroll-smooth px-[calc(50%-80px)] pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
            }}
            role="region"
            aria-roledescription="carousel"
            aria-label={t(locale, "dashboard_preview_title")}
            onPointerDown={pauseAuto}
            onTouchStart={pauseAuto}
            onWheel={pauseAuto}
          >
            {slides.map((slide, i) => (
              <div
                key={slide.key}
                ref={(node) => {
                  itemRefs.current[i] = node;
                }}
                data-preview-index={i}
                className="h-[300px] w-[160px] shrink-0 snap-center"
                style={{ scrollSnapAlign: "center" }}
                aria-hidden={i !== index}
              >
                {slide.node}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-1 flex justify-center gap-2">
          {slides.map((slide, i) => (
            <button
              key={slide.key}
              type="button"
              aria-label={`${t(locale, "dashboard_preview_title")} ${i + 1}`}
              aria-current={i === index}
              onClick={() => {
                pauseAuto();
                goTo(i);
              }}
              className={`h-2 rounded-full transition-all ${
                i === index ? "w-6 bg-[#0b3d8c]" : "w-2 bg-[#0b3d8c]/25"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="hidden items-end justify-center gap-3 lg:flex">
        <div className="h-[230px] w-[118px]">
          <PreviewPhoneTrack locale={locale} />
        </div>
        <div className="-mt-4 h-[250px] w-[128px]">
          <PreviewPhoneHome tagline={tagline} />
        </div>
        <div className="h-[230px] w-[118px]">
          <PreviewPhoneServices locale={locale} />
        </div>
        <div className="h-[230px] w-[118px]">
          <PreviewPhoneShops locale={locale} />
        </div>
      </div>
    </>
  );
}
