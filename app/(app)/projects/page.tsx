"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
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

type ProductRow = {
  id: string;
  title: string;
  priceCents: number;
  photoUrl?: string | null;
  photosJson?: string | null;
  active: boolean;
};

type ShopRow = {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  city: string;
  country: string;
  status: string;
  currency?: string;
  coverUrl?: string | null;
  logoUrl?: string | null;
  products?: ProductRow[];
  _count?: { products: number };
};

function productCover(product: ProductRow) {
  if (product.photoUrl) return product.photoUrl;
  try {
    const photos = JSON.parse(product.photosJson || "[]") as unknown;
    if (Array.isArray(photos) && typeof photos[0] === "string") return photos[0];
  } catch {
    /* ignore */
  }
  return null;
}

function OptionsMenu({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <details className="relative">
      <summary className="cursor-pointer list-none rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm font-medium">
        {label}
      </summary>
      <div className="absolute right-0 z-20 mt-1 flex min-w-44 flex-col gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-lg">
        {children}
      </div>
    </details>
  );
}

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
    if (status === "PAUSED") return t("my_projects_status_paused");
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

  async function setServiceStatus(id: string, status: "OPEN" | "PAUSED") {
    setBusyId(id);
    setActionError("");
    try {
      const res = await fetch(`/api/services/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(data.error || t("my_projects_share_error"));
        return;
      }
      setServices((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status } : s))
      );
    } catch {
      setActionError(t("my_projects_share_error"));
    } finally {
      setBusyId(null);
    }
  }

  async function setShopStatus(id: string, action: "publish" | "pause") {
    setBusyId(id);
    setActionError("");
    try {
      const res = await fetch(`/api/shops/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(data.error || t("my_projects_share_error"));
        return;
      }
      const status = action === "publish" ? "OPEN" : "DRAFT";
      setShops((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
    } catch {
      setActionError(t("my_projects_share_error"));
    } finally {
      setBusyId(null);
    }
  }

  async function setProductActive(shopId: string, productId: string, active: boolean) {
    setBusyId(productId);
    setActionError("");
    try {
      const res = await fetch(`/api/shops/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(data.error || t("my_projects_share_error"));
        return;
      }
      setShops((prev) =>
        prev.map((shop) =>
          shop.id === shopId
            ? {
                ...shop,
                products: (shop.products ?? []).map((p) =>
                  p.id === productId ? { ...p, active } : p
                ),
              }
            : shop
        )
      );
    } catch {
      setActionError(t("my_projects_share_error"));
    } finally {
      setBusyId(null);
    }
  }

  async function deleteProduct(shopId: string, productId: string) {
    if (!confirm(t("my_projects_delete_service_confirm"))) return;
    setBusyId(productId);
    setActionError("");
    try {
      const res = await fetch(`/api/shops/products/${productId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(data.error || t("my_projects_share_error"));
        return;
      }
      setShops((prev) =>
        prev.map((shop) =>
          shop.id === shopId
            ? {
                ...shop,
                products: (shop.products ?? []).map((p) =>
                  p.id === productId ? { ...p, active: false } : p
                ),
              }
            : shop
        )
      );
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
                    <div className="relative h-40 w-full shrink-0 bg-[var(--surface-2)] sm:h-auto sm:w-44">
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
                          <p className="mt-1 text-sm font-medium text-[var(--foreground)]">
                            {formatMoney(
                              s.priceAmount,
                              (normalizeCurrency(s.currency) as MoneyCurrency) ??
                                "CAD"
                            )}
                          </p>
                        )}
                        <Badge className="mt-2">{serviceStatusLabel(s.status)}</Badge>
                      </div>
                      <OptionsMenu label={t("my_projects_options")}>
                        <Link href={`/services/listing/${s.id}/edit`}>
                          <Button size="sm" variant="ghost" className="w-full justify-start">
                            {t("my_projects_edit")}
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full justify-start"
                          disabled={busyId === s.id}
                          onClick={() =>
                            void setServiceStatus(
                              s.id,
                              s.status === "PAUSED" ? "OPEN" : "PAUSED"
                            )
                          }
                        >
                          {s.status === "PAUSED"
                            ? t("my_projects_resume")
                            : t("my_projects_pause")}
                        </Button>
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
                          className="w-full justify-start"
                          disabled={busyId === s.id}
                          onClick={() => void deleteService(s.id)}
                        >
                          {t("my_projects_delete")}
                        </Button>
                      </OptionsMenu>
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
                    <div className="relative h-40 w-full shrink-0 bg-[var(--surface-2)] sm:h-auto sm:w-44">
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
                      <OptionsMenu label={t("my_projects_options")}>
                        <Link href={`/shops/${s.id}/manage`}>
                          <Button size="sm" variant="ghost" className="w-full justify-start">
                            {t("my_projects_edit")}
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full justify-start"
                          disabled={busyId === s.id}
                          onClick={() =>
                            void setShopStatus(
                              s.id,
                              s.status === "OPEN" ? "pause" : "publish"
                            )
                          }
                        >
                          {s.status === "OPEN"
                            ? t("my_projects_pause")
                            : t("my_projects_resume")}
                        </Button>
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
                          className="w-full justify-start"
                          disabled={busyId === s.id}
                          onClick={() => void deleteShop(s.id)}
                        >
                          {t("my_projects_delete")}
                        </Button>
                      </OptionsMenu>
                    </div>
                  </div>
                  {(s.products ?? []).length > 0 && (
                    <div className="grid grid-cols-2 gap-2 border-t border-[var(--border)] p-3 sm:grid-cols-4">
                      {(s.products ?? []).map((product) => {
                        const photo = productCover(product);
                        return (
                          <div
                            key={product.id}
                            className={`overflow-hidden rounded-xl border border-[var(--border)] ${product.active ? "" : "opacity-60"}`}
                          >
                            <div className="relative h-24 bg-[var(--surface-2)]">
                              {photo ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={photo} alt="" className="h-full w-full object-cover" />
                              ) : null}
                              <div className="absolute right-1 top-1">
                                <OptionsMenu label="⋯">
                                  <Link href={`/shops/${s.id}/manage`}>
                                    <Button size="sm" variant="ghost" className="w-full justify-start">
                                      {t("my_projects_edit")}
                                    </Button>
                                  </Link>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="w-full justify-start"
                                    disabled={busyId === product.id}
                                    onClick={() =>
                                      void setProductActive(s.id, product.id, !product.active)
                                    }
                                  >
                                    {product.active
                                      ? t("my_projects_pause")
                                      : t("my_projects_resume")}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    className="w-full justify-start"
                                    disabled={busyId === product.id}
                                    onClick={() => void deleteProduct(s.id, product.id)}
                                  >
                                    {t("my_projects_delete")}
                                  </Button>
                                </OptionsMenu>
                              </div>
                            </div>
                            <p className="truncate px-2 py-1 text-xs font-medium">{product.title}</p>
                            <p className="px-2 pb-2 text-xs text-[var(--muted)]">
                              {formatMoney(
                                product.priceCents / 100,
                                (normalizeCurrency(s.currency) as MoneyCurrency) ?? "XAF"
                              )}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
