"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/locale-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { formatMoneyFromCents } from "@/lib/currency";
import {
  shopCategoryHasElectronicsSpecs,
  shopCategoryLabel,
} from "@/lib/shops-catalog";

type Product = {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  photoUrl: string | null;
  warranty: string | null;
  stockQty: number | null;
  highlights: string | null;
  effectivePriceCents: number;
  hasPromo: boolean;
  promoLabel: string | null;
  active: boolean;
};

type Shop = {
  id: string;
  name: string;
  description: string;
  category: string;
  city: string;
  country: string;
  currency: string;
  coverUrl: string | null;
  logoUrl: string | null;
  status: string;
  isOwner?: boolean;
  products: Product[];
  user: {
    displayName: string;
    avatarUrl?: string | null;
    ratingAvg: number;
    ratingCount: number;
  };
};

function ShopInitials({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span className="text-xl font-semibold text-white/90">
      {initials || "?"}
    </span>
  );
}

export default function ShopDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useI18n();
  const [shop, setShop] = useState<Shop | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/shops/${id}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur");
        return;
      }
      setShop(data.shop);
    })();
  }, [id]);

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }
  if (!shop) {
    return <p className="text-sm text-[var(--muted)]">{t("loading")}</p>;
  }

  const loc = locale === "en" ? "en-CA" : "fr-CA";
  const products = shop.products.filter((p) => p.active || shop.isOwner);
  const logoSrc = shop.logoUrl || shop.user.avatarUrl || null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/shops" className="text-sm text-[var(--accent)]">
          ← {t("shops_title")}
        </Link>
        {shop.isOwner && (
          <Link href={`/shops/${shop.id}/manage`}>
            <Button variant="outline" size="sm">
              {t("shops_manage")}
            </Button>
          </Link>
        )}
      </div>

      {/* Banner — full image, no crop */}
      <div className="overflow-hidden rounded-xl bg-[#0f1419]">
        {shop.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shop.coverUrl}
            alt=""
            className="mx-auto block h-auto w-full max-h-[28rem] object-contain"
          />
        ) : (
          <div className="flex min-h-40 w-full items-center justify-center bg-gradient-to-br from-[#1a2330] to-[#0f1419]">
            <span className="text-sm text-white/50">{t("shops_cover")}</span>
          </div>
        )}
      </div>

      {/* Identity section: dark band, logo bubble, title + description */}
      <section className="-mt-10 rounded-xl bg-[#12181f] px-4 pb-5 pt-0 text-white shadow-lg sm:-mt-12 sm:px-6 sm:pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
          <div className="-mt-10 flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-[#12181f] bg-[#1e2833] shadow-md sm:-mt-12 sm:h-28 sm:w-28">
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoSrc}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <ShopInitials name={shop.name} />
            )}
          </div>
          <div className="min-w-0 flex-1 pb-1 pt-2 sm:pt-0">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {shop.name}
            </h1>
            <p className="mt-1 text-sm text-white/70">
              {shopCategoryLabel(shop.category, locale)}
              {shop.city ? ` · ${shop.city}` : ""}
              {shop.country ? `, ${shop.country}` : ""}
              {shop.user.displayName ? ` · ${shop.user.displayName}` : ""}
            </p>
            {shop.user.ratingCount > 0 && (
              <p className="mt-1 text-sm text-amber-300/90">
                ★ {shop.user.ratingAvg.toFixed(1)} ({shop.user.ratingCount})
              </p>
            )}
          </div>
        </div>
        {shop.description && (
          <p className="mt-4 max-w-3xl border-t border-white/10 pt-4 text-base leading-relaxed text-white/90">
            {shop.description}
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("shops_products")}</h2>
        {products.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">—</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {products.map((p) => (
              <Link key={p.id} href={`/shops/product/${p.id}`}>
                <Card className="h-full transition hover:border-[var(--accent)]">
                  {p.photoUrl && (
                    <div className="mb-3 flex max-h-72 min-h-[12rem] items-center justify-center overflow-hidden rounded-md bg-[var(--surface-2)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.photoUrl}
                        alt=""
                        className="max-h-72 w-full object-contain"
                      />
                    </div>
                  )}
                  <CardTitle className="text-base">{p.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {p.description}
                  </CardDescription>
                  <p className="mt-2 text-sm">
                    {p.hasPromo && (
                      <span className="mr-2 text-[var(--muted)] line-through">
                        {formatMoneyFromCents(p.priceCents, shop.currency, loc)}
                      </span>
                    )}
                    <span className="font-semibold text-[var(--accent)]">
                      {formatMoneyFromCents(
                        p.effectivePriceCents,
                        shop.currency,
                        loc
                      )}
                    </span>
                    {p.promoLabel && (
                      <Badge className="ml-2">{p.promoLabel}</Badge>
                    )}
                  </p>
                  {shopCategoryHasElectronicsSpecs(shop.category) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {p.warranty && (
                        <Badge>
                          {t("shops_warranty")}: {p.warranty}
                        </Badge>
                      )}
                      {p.stockQty != null && (
                        <Badge>
                          {p.stockQty > 0
                            ? `${t("shops_stock_available")}: ${p.stockQty}`
                            : t("shops_stock_out")}
                        </Badge>
                      )}
                    </div>
                  )}
                  {shopCategoryHasElectronicsSpecs(shop.category) &&
                    p.highlights && (
                      <p className="mt-2 line-clamp-2 text-xs text-[var(--muted)]">
                        {p.highlights}
                      </p>
                    )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
