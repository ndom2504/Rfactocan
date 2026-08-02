/** Shared lifestyle / promo banners for home + auth. */
export const RFACTO_SLIDES = [
  {
    id: "communaute",
    src: "/images/home/slide-communaute.png",
    altKey: "home_slide_communaute_alt" as const,
    /** Opens WhatsApp community when NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL is set. */
    link: "whatsapp" as const,
  },
] as const;

export const RFACTO_SLIDE_MS = 6500;
