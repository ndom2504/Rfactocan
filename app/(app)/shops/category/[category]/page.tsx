"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
  isShopCategoryId,
  shopCategoryHint,
  shopCategoryLabel,
} from "@/lib/shops-catalog";

type ShopRow = {
  id: string;
  name: string;
  city: string;
  country: string;
  coverUrl?: string | null;
  logoUrl?: string | null;
  user?: { displayName: string };
  _count?: { products: number };
};

export default function ShopCategoryPage() {
  const params = useParams();
  const category = String(params.category ?? "");
  const { t, locale } = useI18n();
  const [shops, setShops] = useState<ShopRow[]>([]);

  useEffect(() => {
    if (!isShopCategoryId(category)) return;
    void (async () => {
      const res = await fetch(
        `/api/shops?category=${encodeURIComponent(category)}`
      );
      const data = await res.json();
      if (data.shops) setShops(data.shops);
    })();
  }, [category]);

  if (!isShopCategoryId(category)) {
    return <p className="text-sm text-[var(--muted)]">Catégorie invalide</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/shops" className="text-sm text-[var(--accent)]">
            ← {t("shops_title")}
          </Link>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold">
            {shopCategoryLabel(category, locale)}
          </h1>
          <p className="mt-1 text-[var(--muted)]">
            {shopCategoryHint(category, locale)}
          </p>
        </div>
        <Link href={`/shops/new?category=${category}`}>
          <Button>{t("publish_shop_cta")}</Button>
        </Link>
      </div>

      {shops.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">{t("shops_no_shops")}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {shops.map((s) => {
            const banner = s.coverUrl || s.logoUrl || null;
            return (
              <Link key={s.id} href={`/shops/${s.id}`}>
                <Card className="h-full overflow-hidden p-0 transition hover:border-[var(--accent)]">
                  <div className="relative h-28 w-full bg-[var(--surface-2)]">
                    {banner ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={banner}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-[var(--muted)]">
                        {t("services_no_cover")}
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <CardTitle className="text-base">{s.name}</CardTitle>
                    <CardDescription>
                      {s.city}, {s.country}
                      {s.user ? ` · ${s.user.displayName}` : ""}
                    </CardDescription>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      {s._count?.products ?? 0}{" "}
                      {t("shops_products").toLowerCase()}
                    </p>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
