import type { Locale } from "@/lib/i18n";

/** Shared lifestyle / promo banners for home + auth. */
export const RFACTO_SLIDES = [
  {
    id: "communaute",
    src: {
      fr: "/images/home/slide-communaute.png",
      en: "/images/home/slide-communaute-en.png",
    },
    altKey: "home_slide_communaute_alt" as const,
    /** Opens WhatsApp community when an invite URL is set in admin (or env). */
    link: "whatsapp" as const,
  },
] as const;

export function rfactoSlideSrc(
  slide: (typeof RFACTO_SLIDES)[number],
  locale: Locale
) {
  return slide.src[locale] ?? slide.src.fr;
}

export const RFACTO_SLIDE_MS = 6500;
