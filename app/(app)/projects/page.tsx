"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney, normalizeCurrency, type MoneyCurrency } from "@/lib/currency";
import { categoryLabel, serviceTypeLabel } from "@/lib/services-catalog";
import { shopCategoryLabel } from "@/lib/shops-catalog";
import { ShareProjectToCommunityButton } from "@/components/share-project-to-community";

type ServiceRow = {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  serviceType: string;
  city: string;
  country: string;
  status: string;
  priceAmount: number | null;
  currency: string;
  photos: string[];
};

type ShopRow = {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  city: string;
  country: string;
  status: string;
  coverUrl?: string | null;
  logoUrl?: string | null;
  _count?: { products: number };
};

export default function MyProjectsPage() {
  const { t, locale } = useI18n();
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const [svcRes, shopRes] = await Promise.all([
          fetch("/api/services?mine=1"),
          fetch("/api/shops?mine=1"),
        ]);
        const svcData = await svcRes.json();
        const shopData = await shopRes.json();
        if (svcRes.ok && svcData.listings) setServices(svcData.listings);
        if (shopRes.ok && shopData.shops) setShops(shopData.shops);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const empty = !loading && services.length === 0 && shops.length === 0;

  function serviceStatusLabel(status: string) {
    if (status === "OPEN") return t("my_projects_status_open");
    if (status === "CLOSED") return t("my_projects_status_closed");
    return status;
  }

  function shopStatusLabel(status: string) {
    if (status === "OPEN") return t("shops_status_open");
    if (status === "CLOSED") return t("shops_status_closed");
    return t("shops_status_draft");
  }

  async function deleteService(id: string) {
    if (!confirm(t("my_projects_delete_service_confirm"))) return;
    setBusyId(id);
    setActionError("");
    try {
      const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(data.error || t("my_projects_share_error"));
        return;
      }
      setServices((prev) => prev.filter((s) => s.id !== id));
    } catch {
      setActionError(t("my_projects_share_error"));
    } finally {
      setBusyId(null);
    }
  }

  async function deleteShop(id: string) {
    if (!confirm(t("my_projects_delete_shop_confirm"))) return;
    setBusyId(id);
    setActionError("");
    try {
      const res = await fetch(`/api/shops/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(data.error || t("my_projects_share_error"));
        return;
      }
      setShops((prev) => prev.filter((s) => s.id !== id));
    } catch {
      setActionError(t("my_projects_share_error"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            ← {t("nav_dashboard")}
          </Link>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold">
            {t("my_projects_title")}
          </h1>
          <p className="mt-1 text-[var(--muted)]">{t("my_projects_subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/services/new">
            <Button variant="outline">{t("publish_service_cta")}</Button>
          </Link>
          <Link href="/shops/new">
            <Button>{t("publish_shop_cta")}</Button>
          </Link>
        </div>
      </div>

      {actionError && (
        <p className="text-sm text-red-700">{actionError}</p>
      )}

      {loading && (
        <p className="text-sm text-[var(--muted)]">{t("loading")}</p>
      )}

      {empty && (
        <Card className="p-6 text-center">
          <CardTitle className="text-lg">{t("my_projects_empty_title")}</CardTitle>
          <CardDescription className="mt-2">
            {t("my_projects_empty_hint")}
          </CardDescription>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href="/services/new">
              <Button>{t("publish_service_cta")}</Button>
            </Link>
            <Link href="/shops/new">
              <Button variant="outline">{t("publish_shop_cta")}</Button>
            </Link>
          </div>
        </Card>
      )}

      {!loading && services.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
            {t("my_projects_services")}
          </h2>
          <div className="grid gap-3">
            {services.map((s) => {
              const cover = s.photos?.[0] ?? null;
              return (
                <Card key={s.id} className="overflow-hidden p-0">
                  <div className="flex flex-col sm:flex-row">
                    <div className="relative h-28 w-full shrink-0 bg-[var(--surface-2)] sm:h-auto sm:w-32">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cover}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full min-h-[7rem] items-center justify-center text-xs text-[var(--muted)]">
                          {t("services_no_cover")}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-wrap items-start justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <CardTitle className="text-base">{s.title}</CardTitle>
                        <CardDescription>
                          {categoryLabel(s.category, locale === "en" ? "en" : "fr")}{" "}
                          ·{" "}
                          {serviceTypeLabel(
                            s.category,
                            s.serviceType,
                            locale === "en" ? "en" : "fr"
                          )}{" "}
                          · {s.city}, {s.country}
                        </CardDescription>
                        {s.priceAmount != null && (
                          <p className="mt-1 text-sm font-medium text-[var(--accent)]">
                            {formatMoney(
                              s.priceAmount,
                              (normalizeCurrency(s.currency) as MoneyCurrency) ??
                                "CAD"
                            )}
                          </p>
                        )}
                        <Badge className="mt-2">{serviceStatusLabel(s.status)}</Badge>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Link href={`/services/listing/${s.id}`}>
                          <Button size="sm" variant="outline">
                            {t("open")}
                          </Button>
                        </Link>
                        <Link href={`/services/listing/${s.id}/edit`}>
                          <Button size="sm">{t("my_projects_edit")}</Button>
                        </Link>
                        <ShareProjectToCommunityButton
                          kind="service"
                          title={s.title}
                          description={s.description}
                          city={s.city}
                          country={s.country}
                          href={`/services/listing/${s.id}`}
                          coverUrl={cover}
                        />
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={busyId === s.id}
                          onClick={() => void deleteService(s.id)}
                        >
                          {busyId === s.id ? t("loading") : t("my_projects_delete")}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {!loading && shops.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
            {t("my_projects_shops")}
          </h2>
          <div className="grid gap-3">
            {shops.map((s) => {
              const cover = s.coverUrl || s.logoUrl || null;
              return (
                <Card key={s.id} className="overflow-hidden p-0">
                  <div className="flex flex-col sm:flex-row">
                    <div className="relative h-28 w-full shrink-0 bg-[var(--surface-2)] sm:h-auto sm:w-32">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cover}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full min-h-[7rem] items-center justify-center text-xs text-[var(--muted)]">
                          {t("services_no_cover")}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-wrap items-start justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <CardTitle className="text-base">{s.name}</CardTitle>
                        <CardDescription>
                          {shopCategoryLabel(s.category, locale)} · {s.city}
                        </CardDescription>
                        <Badge className="mt-2">{shopStatusLabel(s.status)}</Badge>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {s._count?.products ?? 0}{" "}
                          {t("shops_products").toLowerCase()}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Link href={`/shops/${s.id}`}>
                          <Button size="sm" variant="outline">
                            {t("open")}
                          </Button>
                        </Link>
                        <Link href={`/shops/${s.id}/manage`}>
                          <Button size="sm">{t("shops_manage")}</Button>
                        </Link>
                        <ShareProjectToCommunityButton
                          kind="shop"
                          title={s.name}
                          description={s.description}
                          city={s.city}
                          country={s.country}
                          href={`/shops/${s.id}`}
                          coverUrl={cover}
                        />
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={busyId === s.id}
                          onClick={() => void deleteShop(s.id)}
                        >
                          {busyId === s.id ? t("loading") : t("my_projects_delete")}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
