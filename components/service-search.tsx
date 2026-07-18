"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/locale-provider";
import { categoryLabel, serviceTypeLabel } from "@/lib/services-catalog";
import { formatMoney, type MoneyCurrency } from "@/lib/currency";

type ServiceHit = {
  id: string;
  title: string;
  description: string;
  category: string;
  serviceType: string;
  country: string;
  city: string;
  priceAmount: number | null;
  priceUnit: string;
  currency: string;
  user?: { displayName: string; ratingAvg: number; ratingCount: number };
};

type Props = {
  hideHeading?: boolean;
  plain?: boolean;
};

export function ServiceSearch({ hideHeading = false, plain = false }: Props) {
  const { t, locale } = useI18n();
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [results, setResults] = useState<ServiceHit[]>([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function runSearch() {
    setError("");
    startTransition(async () => {
      const params = new URLSearchParams();
      if (country.trim()) params.set("country", country.trim().toUpperCase());
      if (city.trim()) params.set("city", city.trim());
      const res = await fetch(`/api/services?${params}`);
      const data = await res.json();
      setSearched(true);
      if (!res.ok) {
        setError(data.error ?? "Recherche impossible");
        setResults([]);
        return;
      }
      let list = (data.listings ?? []) as ServiceHit[];
      const needle = q.trim().toLowerCase();
      if (needle) {
        list = list.filter(
          (item) =>
            item.title.toLowerCase().includes(needle) ||
            item.description.toLowerCase().includes(needle) ||
            item.serviceType.toLowerCase().includes(needle) ||
            item.category.toLowerCase().includes(needle) ||
            (item.user?.displayName ?? "").toLowerCase().includes(needle)
        );
      }
      setResults(list);
    });
  }

  const body = (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="service-q">{t("search")}</Label>
          <Input
            id="service-q"
            placeholder={t("search_services_placeholder")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") runSearch();
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="service-country">{t("country")}</Label>
          <Input
            id="service-country"
            placeholder="GA"
            value={country}
            maxLength={2}
            onChange={(e) => setCountry(e.target.value.toUpperCase())}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="service-city">{t("city")}</Label>
          <Input
            id="service-city"
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
            {results.length} {t("services_found")}
          </p>
          {results.length === 0 && (
            <p className="text-sm text-[var(--muted)]">{t("services_empty")}</p>
          )}
          {results.map((item) => (
            <Link key={item.id} href={`/services/listing/${item.id}`}>
              <Card className="mb-2 transition hover:border-[var(--accent)]">
                <CardTitle className="text-base">{item.title}</CardTitle>
                <CardDescription>
                  {serviceTypeLabel(item.category, item.serviceType, locale)} ·{" "}
                  {categoryLabel(item.category, locale)} · {item.city},{" "}
                  {item.country}
                  {item.priceAmount != null && (
                    <>
                      {" · "}
                      {formatMoney(
                        item.priceAmount,
                        (item.currency as MoneyCurrency) || "CAD",
                        locale === "en" ? "en-CA" : "fr-CA"
                      )}
                    </>
                  )}
                </CardDescription>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );

  return (
    <section className="space-y-4">
      {!hideHeading && (
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
            {t("search_services")}
          </h2>
          <p className="text-sm text-[var(--muted)]">{t("search_services_hint")}</p>
        </div>
      )}
      {plain ? body : <Card>{body}</Card>}
    </section>
  );
}
