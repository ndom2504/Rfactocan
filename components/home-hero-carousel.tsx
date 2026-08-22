"use client";

import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { RFACTO_SLIDES, rfactoSlideSrc } from "@/lib/rfacto-slides";

const SLIDE = {
  ...RFACTO_SLIDES[0]!,
  labelKey: "home_slide_communaute" as const,
};

type Props = {
  startHref: string;
  whatsappUrl?: string | null;
};

export function HomeHeroCarousel({ startHref, whatsappUrl = null }: Props) {
  const { locale, t } = useI18n();
  const whatsapp = whatsappUrl;

  const image = (
    <Image
      src={rfactoSlideSrc(SLIDE, locale)}
      alt={t(SLIDE.altKey)}
      width={1024}
      height={576}
      priority
      sizes="(max-width: 1400px) 100vw, 1400px"
      className="h-auto w-full"
    />
  );

  return (
    <section
      className="relative isolate overflow-hidden rounded-none bg-[var(--hero-from)] md:rounded-b-[2rem]"
      aria-label={t("home_carousel_label")}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(165deg, #1b3b14 0%, #28541d 55%, #404d35 100%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-[1400px]">
        <div className="relative w-full">
          {whatsapp ? (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
              aria-label={t("cta_join_whatsapp")}
            >
              {image}
            </a>
          ) : (
            image
          )}
        </div>

        <div className="relative z-10 mx-auto w-full max-w-3xl px-4 pb-5 pt-3 sm:px-6 sm:pb-6">
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-md sm:p-4">
            <p className="font-[family-name:var(--font-display)] text-base font-semibold text-white sm:text-lg">
              {t(SLIDE.labelKey)}
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Link href={startHref} className="sm:flex-1">
                <Button
                  size="lg"
                  className="h-11 w-full bg-white text-sm font-semibold !text-[var(--rfacto-green-dark)] shadow-lg shadow-black/20 hover:bg-white/90 hover:!text-[var(--rfacto-green-dark)]"
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
                    className="h-11 w-full bg-[#25D366] text-sm font-semibold text-white hover:bg-[#1ebe57]"
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
