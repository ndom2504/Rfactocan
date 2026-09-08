export const SHOP_CATEGORY_IDS = [
  "food_appliances",
  "cosmetics",
  "auto_parts",
  "electronics",
  "clothing_accessories",
] as const;

export type ShopCategoryId = (typeof SHOP_CATEGORY_IDS)[number];

export const SHOP_CATEGORIES: {
  id: ShopCategoryId;
  fr: string;
  en: string;
}[] = [
  { id: "food_appliances", fr: "Alimentation & électroménager", en: "Food & appliances" },
  { id: "cosmetics", fr: "Cosmétique", en: "Cosmetics" },
  { id: "auto_parts", fr: "Automobile & pièces", en: "Auto & spare parts" },
  { id: "electronics", fr: "Électronique", en: "Electronics" },
  { id: "clothing_accessories", fr: "Vêtements et accessoires", en: "Clothing & accessories" },
];

export function shopCategoryLabel(id: string, locale: string) {
  const cat = SHOP_CATEGORIES.find((c) => c.id === id);
  if (!cat) return id;
  return locale === "en" ? cat.en : cat.fr;
}
