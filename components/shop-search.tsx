"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useI18n } from "@/components/locale-provider";
import { UserAvatar } from "@/components/user-avatar";
import {
  SHOP_CATEGORIES,
  shopCategoryLabel,
} from "@/lib/shops-catalog";

type ShopHit = {
  id: string;
  name: string;
  description: string;
  category: string;
  country: string;
  city: string;
  coverUrl?: string | null;
  logoUrl?: string | null;
  _count?: { products: number };
  user?: {
    displayName: string;
    ratingAvg: number;
    ratingCount: number;
    avatarUrl?: string | null;
  };
};

type Props = {
  hideHeading?: boolean;
  plain?: boolean;
};

export function ShopSearch({ hideHeading = false, plain = false }: Props) {
  const { t, locale } = useI18n();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [results, setResults] = useState<ShopHit[]>([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function runSearch() {
    setError("");
    startTransition(async () => {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (category) params.set("category", category);
      if (country.trim()) params.set("country", country.trim().toUpperCase());
      if (city.trim()) params.set("city", city.trim());
      const res = await fetch(`/api/shops?${params}`);
      const data = await res.json();
      setSearched(true);
      if (!res.ok) {
        setError(data.error ?? "Recherche impossible");
        setResults([]);
        return;
      }
      setResults((data.shops ?? []) as ShopHit[]);
    });
  }

  const body = (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="shop-q">{t("search")}</Label>
          <Input
            id="shop-q"
            placeholder={t("search_shops_placeholder")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") runSearch();
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="shop-category">{t("shops_category")}</Label>
          <Select
            id="shop-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">{t("all")}</option>
            {SHOP_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {locale === "en" ? c.labelEn : c.labelFr}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="shop-country">{t("country")}</Label>
          <Input
            id="shop-country"
            placeholder="GA"
            value={country}
            maxLength={2}
            onChange={(e) => setCountry(e.target.value.toUpperCase())}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="shop-city">{t("city")}</Label>
          <Input
            id="shop-city"
            placeholder={t("services_city_filter")}
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>
        <div className="flex items-end gap-2">
          <Button disabled={pending} onClick={runSearch} className="w-full">
            {pending ? t("loading") : t("search")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              setQ("");
              setCategory("");
              setCountry("");
              setCity("");
              setResults([]);
              setSearched(false);
              setError("");
            }}
          >
            {t("reset")}
          </Button>
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      {searched && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-[var(--muted)]">
            {results.length} {t("shops_found")}
          </p>
          {results.length === 0 && (
            <p className="text-sm text-[var(--muted)]">{t("shops_no_shops")}</p>
          )}
          {results.map((item) => {
            const banner = item.coverUrl || item.logoUrl || null;
            return (
              <Link key={item.id} href={`/shops/${item.id}`}>
                <Card className="mb-2 overflow-hidden p-0 transition hover:border-[var(--accent)]">
                  <div className="relative h-36 w-full bg-[var(--surface-2)] sm:h-40">
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
                  <div className="flex items-start gap-3 p-4">
                    <UserAvatar
                      name={item.user?.displayName ?? item.name}
                      avatarUrl={item.logoUrl || item.user?.avatarUrl}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base">{item.name}</CardTitle>
                      <CardDescription>
                        {shopCategoryLabel(item.category, locale)} · {item.city},{" "}
                        {item.country}
                        {item._count?.products != null
                          ? ` · ${item._count.products} ${t("shops_products").toLowerCase()}`
                          : ""}
                      </CardDescription>
                      {item.user?.displayName && (
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {item.user.displayName}
                          {item.user.ratingCount
                            ? ` · ★ ${item.user.ratingAvg.toFixed(1)}`
                            : ""}
                        </p>
                      )}
                      {item.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );

  return (
    <section className="space-y-4">
      {!hideHeading && (
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
            {t("search_shops")}
          </h2>
          <p className="text-sm text-[var(--muted)]">{t("search_shops_hint")}</p>
        </div>
      )}
      {plain ? body : <Card>{body}</Card>}
    </section>
  );
}
