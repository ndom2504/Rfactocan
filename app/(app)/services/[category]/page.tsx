"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  getCategory,
  isServiceCategoryId,
  serviceTypeLabel,
} from "@/lib/services-catalog";
import { formatMoney } from "@/lib/currency";
import type { MoneyCurrency } from "@/lib/currency";

type Listing = {
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
  user: { displayName: string; ratingAvg: number; ratingCount: number };
};

export default function ServiceCategoryPage() {
  const params = useParams();
  const category = String(params.category || "");
  const { t, locale } = useI18n();
  const cat = isServiceCategoryId(category) ? getCategory(category) : undefined;
  const [type, setType] = useState("");
  const [city, setCity] = useState("");
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!cat || cat.isParcel) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const q = new URLSearchParams({ category });
    if (type) q.set("type", type);
    if (city.trim()) q.set("city", city.trim());
    fetch(`/api/services?${q}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur");
        if (!cancelled) setListings(data.listings ?? []);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category, type, city, cat]);

  if (!cat) {
    return (
      <div className="space-y-4">
        <p className="text-[var(--muted)]">{t("services_unknown_category")}</p>
        <Link href="/services">
          <Button variant="outline">{t("services_back")}</Button>
        </Link>
      </div>
    );
  }

  const label = locale === "en" ? cat.labelEn : cat.labelFr;
  const hint = locale === "en" ? cat.hintEn : cat.hintFr;

  if (cat.isParcel) {
    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/services"
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            ← {t("services_back")}
          </Link>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold">
            {label}
          </h1>
          <p className="mt-1 text-[var(--muted)]">{hint}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Link href="/requests/new">
            <Card className="h-full transition hover:border-[var(--accent)]">
              <CardTitle>{t("services_parcel_send")}</CardTitle>
              <CardDescription className="mt-2">
                {t("publish_request")}
              </CardDescription>
            </Card>
          </Link>
          <Link href="/requests">
            <Card className="h-full transition hover:border-[var(--accent)]">
              <CardTitle>{t("services_parcel_browse_requests")}</CardTitle>
              <CardDescription className="mt-2">
                {t("nav_requests")}
              </CardDescription>
            </Card>
          </Link>
          <Link href="/trips/new">
            <Card className="h-full transition hover:border-[var(--accent)]">
              <CardTitle>{t("services_parcel_offer_trip")}</CardTitle>
              <CardDescription className="mt-2">
                {t("publish_trip")}
              </CardDescription>
            </Card>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/services"
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            ← {t("services_back")}
          </Link>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold">
            {label}
          </h1>
          <p className="mt-1 text-[var(--muted)]">{hint}</p>
        </div>
        <Link href={`/services/new?category=${category}${type ? `&type=${type}` : ""}`}>
          <Button>{t("services_publish")}</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t("services_type")}</Label>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">{t("all")}</option>
            {cat.types.map((tp) => (
              <option key={tp.id} value={tp.id}>
                {locale === "en" ? tp.labelEn : tp.labelFr}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t("city")}</Label>
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={t("services_city_filter")}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}
      {loading && <p className="text-[var(--muted)]">{t("loading")}</p>}
      {!loading && listings.length === 0 && (
        <p className="text-[var(--muted)]">{t("services_empty")}</p>
      )}

      <div className="grid gap-4">
        {listings.map((item) => (
          <Link key={item.id} href={`/services/listing/${item.id}`}>
            <Card className="transition hover:border-[var(--accent)]">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <CardDescription className="mt-1">
                    {serviceTypeLabel(item.category, item.serviceType, locale)}{" "}
                    · {item.city}, {item.country}
                  </CardDescription>
                </div>
                {item.priceAmount != null && (
                  <p className="text-sm font-medium text-[var(--accent)]">
                    {formatMoney(
                      item.priceAmount,
                      (item.currency as MoneyCurrency) || "CAD",
                      locale === "en" ? "en-CA" : "fr-CA"
                    )}
                    <span className="text-[var(--muted)]">
                      {" "}
                      / {item.priceUnit}
                    </span>
                  </p>
                )}
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">
                {item.description}
              </p>
              <p className="mt-2 text-xs text-[var(--muted)]">
                {item.user.displayName}
                {item.user.ratingCount
                  ? ` · ★ ${item.user.ratingAvg.toFixed(1)}`
                  : ""}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
