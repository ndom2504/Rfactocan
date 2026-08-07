export const SHOP_CATEGORY_IDS = [
  "food_appliances",
  "cosmetics",
  "auto_parts",
  "electronics",
] as const;

export type ShopCategoryId = (typeof SHOP_CATEGORY_IDS)[number];

export type ShopCategory = {
  id: ShopCategoryId;
  labelFr: string;
  labelEn: string;
  hintFr: string;
  hintEn: string;
};

export const SHOP_CATEGORIES: ShopCategory[] = [
  {
    id: "food_appliances",
    labelFr: "Alimentation & électroménager",
    labelEn: "Food & appliances",
    hintFr: "Épicerie, boissons, appareils ménagers",
    hintEn: "Groceries, drinks, household appliances",
  },
  {
    id: "cosmetics",
    labelFr: "Cosmétique",
    labelEn: "Cosmetics",
    hintFr: "Beauté, soins, parfums",
    hintEn: "Beauty, skincare, fragrance",
  },
  {
    id: "auto_parts",
    labelFr: "Automobile & pièces détachées",
    labelEn: "Auto & spare parts",
    hintFr: "Pièces, accessoires, entretien auto",
    hintEn: "Parts, accessories, car care",
  },
  {
    id: "electronics",
    labelFr: "Électronique",
    labelEn: "Electronics",
    hintFr: "Téléphones, ordis, gadgets",
    hintEn: "Phones, computers, gadgets",
  },
];

export function isShopCategoryId(value: string): value is ShopCategoryId {
  return (SHOP_CATEGORY_IDS as readonly string[]).includes(value);
}

/** Extra product fields shown for electronics shops. */
export function shopCategoryHasElectronicsSpecs(category: string) {
  return category === "electronics";
}

export function getShopCategory(id: string): ShopCategory | undefined {
  return SHOP_CATEGORIES.find((c) => c.id === id);
}

export function shopCategoryLabel(id: string, locale: string) {
  const cat = getShopCategory(id);
  if (!cat) return id;
  return locale === "en" ? cat.labelEn : cat.labelFr;
}

export function shopCategoryHint(id: string, locale: string) {
  const cat = getShopCategory(id);
  if (!cat) return "";
  return locale === "en" ? cat.hintEn : cat.hintFr;
}

/** Effective unit price in cents (promo if still valid). */
export function effectiveProductPriceCents(product: {
  priceCents: number;
  promoPriceCents?: number | null;
  promoEndsAt?: Date | string | null;
}): number {
  const promo = product.promoPriceCents;
  if (promo == null || promo <= 0 || promo >= product.priceCents) {
    return product.priceCents;
  }
  if (product.promoEndsAt) {
    const ends = new Date(product.promoEndsAt).getTime();
    if (Number.isFinite(ends) && ends < Date.now()) {
      return product.priceCents;
    }
  }
  return promo;
}

export function hasActivePromo(product: {
  priceCents: number;
  promoPriceCents?: number | null;
  promoEndsAt?: Date | string | null;
}): boolean {
  return effectiveProductPriceCents(product) < product.priceCents;
}

/** Max image URLs stored per shop product. */
export const SHOP_PRODUCT_MAX_PHOTOS = 8;

export function parseProductPhotos(product: {
  photoUrl?: string | null;
  photosJson?: string | null;
  photos?: string[] | null;
}): string[] {
  if (Array.isArray(product.photos) && product.photos.length > 0) {
    return product.photos
      .filter((u): u is string => typeof u === "string" && u.trim().length > 0)
      .map((u) => u.trim())
      .slice(0, SHOP_PRODUCT_MAX_PHOTOS);
  }
  try {
    const parsed = JSON.parse(product.photosJson || "[]") as unknown;
    if (Array.isArray(parsed)) {
      const urls = parsed
        .filter((u): u is string => typeof u === "string" && u.trim().length > 0)
        .map((u) => u.trim())
        .slice(0, SHOP_PRODUCT_MAX_PHOTOS);
      if (urls.length > 0) return urls;
    }
  } catch {
    /* fall through */
  }
  return product.photoUrl?.trim() ? [product.photoUrl.trim()] : [];
}

/** Normalize write payload: keep `photoUrl` as cover (= first photo) for legacy clients. */
export function productPhotoFields(input: {
  photos?: string[] | null;
  photoUrl?: string | null;
}): { photoUrl: string | null; photosJson: string } {
  const fromList = Array.isArray(input.photos)
    ? input.photos
        .filter((u): u is string => typeof u === "string" && u.trim().length > 0)
        .map((u) => u.trim())
        .slice(0, SHOP_PRODUCT_MAX_PHOTOS)
    : [];
  const list =
    fromList.length > 0
      ? fromList
      : input.photoUrl?.trim()
        ? [input.photoUrl.trim()]
        : [];
  return {
    photoUrl: list[0] ?? null,
    photosJson: JSON.stringify(list),
  };
}

export function withProductPhotos<T extends {
  photoUrl?: string | null;
  photosJson?: string | null;
}>(product: T): T & { photos: string[]; photoUrl: string | null } {
  const photos = parseProductPhotos(product);
  return {
    ...product,
    photos,
    photoUrl: product.photoUrl || photos[0] || null,
  };
}

export const SHOP_ORDER_STATUS_LABELS: Record<string, { fr: string; en: string }> =
  {
    AWAITING_PAYMENT: { fr: "En attente de paiement", en: "Awaiting payment" },
    PAID: { fr: "Payée", en: "Paid" },
    FULFILLED: { fr: "Livrée / remise", en: "Fulfilled" },
    CANCELLED: { fr: "Annulée", en: "Cancelled" },
  };

export function shopOrderStatusLabel(status: string, locale: string) {
  const row = SHOP_ORDER_STATUS_LABELS[status];
  if (!row) return status;
  return locale === "en" ? row.en : row.fr;
}

export const SHOP_DELIVERY_MODE_LABELS: Record<
  string,
  { fr: string; en: string }
> = {
  NONE: { fr: "Non organisée", en: "Not arranged" },
  MATCH_ONLY: { fr: "Mise en relation", en: "Match only" },
  PARCEL_PAID: { fr: "Livraison Rfacto", en: "Rfacto delivery" },
};

export function shopDeliveryModeLabel(mode: string, locale: string) {
  const row = SHOP_DELIVERY_MODE_LABELS[mode];
  if (!row) return mode;
  return locale === "en" ? row.en : row.fr;
}
