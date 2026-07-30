"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/locale-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { formatMoneyFromCents } from "@/lib/currency";
import { shopCategoryLabel } from "@/lib/shops-catalog";

type Product = {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  photoUrl: string | null;
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
  status: string;
  isOwner?: boolean;
  products: Product[];
  user: { displayName: string; ratingAvg: number; ratingCount: number };
};

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

  return (
    <div className="space-y-6">
      {shop.coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={shop.coverUrl}
          alt=""
          className="h-48 w-full rounded-xl object-cover"
        />
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/shops" className="text-sm text-[var(--accent)]">
            ← {t("shops_title")}
          </Link>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold">
            {shop.name}
          </h1>
          <p className="text-[var(--muted)]">
            {shopCategoryLabel(shop.category, locale)} · {shop.city},{" "}
            {shop.country} · {shop.user.displayName}
          </p>
          {shop.description && (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed">
              {shop.description}
            </p>
          )}
        </div>
        {shop.isOwner && (
          <Link href={`/shops/${shop.id}/manage`}>
            <Button variant="outline">{t("shops_manage")}</Button>
          </Link>
        )}
      </div>

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
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.photoUrl}
                      alt=""
                      className="mb-3 h-40 w-full rounded-md object-cover"
                    />
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
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
