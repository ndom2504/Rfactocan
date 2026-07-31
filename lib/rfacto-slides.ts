/** Shared lifestyle banners for home + auth. */
export const RFACTO_SLIDES = [
  {
    id: "emploi",
    src: "/images/home/slide-emploi.png",
    altKey: "home_slide_emploi_alt" as const,
  },
  {
    id: "boutique",
    src: "/images/home/slide-boutique.png",
    altKey: "home_slide_boutique_alt" as const,
  },
  {
    id: "fournisseurs",
    src: "/images/home/slide-fournisseurs.png",
    altKey: "home_slide_fournisseurs_alt" as const,
  },
] as const;

export const RFACTO_SLIDE_MS = 6500;
