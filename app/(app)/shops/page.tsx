"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  SHOP_CATEGORIES,
  shopCategoryLabel,
} from "@/lib/shops-catalog";

type ShopRow = {
  id: string;
  name: string;
  category: string;
  city: string;
  country: string;
  status: string;
  _count?: { products: number };
  user?: { displayName: string };
};

export default function ShopsHubPage() {
  const { t, locale } = useI18n();
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [mine, setMine] = useState<ShopRow[]>([]);

  useEffect(() => {
    void (async () => {
      const [pub, my] = await Promise.all([
        fetch("/api/shops").then((r) => r.json()),
        fetch("/api/shops?mine=1").then((r) => r.json()),
      ]);
      if (pub.shops) setShops(pub.shops);
      if (my.shops) setMine(my.shops);
    })();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
            {t("shops_title")}
          </h1>
          <p className="mt-1 max-w-2xl text-[var(--muted)]">
            {t("shops_subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/shops/orders">
            <Button variant="outline">{t("shops_orders")}</Button>
          </Link>
          <Link href="/shops/new">
            <Button>{t("publish_shop_cta")}</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {SHOP_CATEGORIES.map((cat) => {
          const label = locale === "en" ? cat.labelEn : cat.labelFr;
          const hint = locale === "en" ? cat.hintEn : cat.hintFr;
          return (
            <Link key={cat.id} href={`/shops/category/${cat.id}`}>
              <Card className="h-full transition hover:border-[var(--accent)]">
                <CardTitle className="text-lg">{label}</CardTitle>
                <CardDescription className="mt-2">{hint}</CardDescription>
                <p className="mt-3 text-sm text-[var(--accent)]">
                  {t("shops_see_list")} →
                </p>
              </Card>
            </Link>
          );
        })}
      </div>

      {mine.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
            {t("shops_my")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {mine.map((s) => (
              <Card key={s.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{s.name}</CardTitle>
                    <CardDescription>
                      {shopCategoryLabel(s.category, locale)} · {s.city}
                    </CardDescription>
                    <Badge className="mt-2">
                      {s.status === "OPEN"
                        ? t("shops_status_open")
                        : s.status === "CLOSED"
                          ? t("shops_status_closed")
                          : t("shops_status_draft")}
                    </Badge>
                  </div>
                  <Link href={`/shops/${s.id}/manage`}>
                    <Button size="sm" variant="outline">
                      {t("shops_manage")}
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          {t("shops_browse")}
        </h2>
        {shops.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">{t("shops_no_shops")}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {shops.map((s) => (
              <Link key={s.id} href={`/shops/${s.id}`}>
                <Card className="h-full transition hover:border-[var(--accent)]">
                  <CardTitle className="text-base">{s.name}</CardTitle>
                  <CardDescription>
                    {shopCategoryLabel(s.category, locale)} · {s.city},{" "}
                    {s.country}
                    {s.user ? ` · ${s.user.displayName}` : ""}
                  </CardDescription>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    {s._count?.products ?? 0} {t("shops_products").toLowerCase()}
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
