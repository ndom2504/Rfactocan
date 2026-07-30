"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/components/locale-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMoneyFromCents } from "@/lib/currency";
import {
  shopCategoryHasElectronicsSpecs,
  shopCategoryLabel,
  shopOrderStatusLabel,
} from "@/lib/shops-catalog";

type Product = {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  promoPriceCents: number | null;
  promoLabel: string | null;
  promoEndsAt: string | null;
  photoUrl: string | null;
  warranty: string | null;
  stockQty: number | null;
  highlights: string | null;
  active: boolean;
  effectivePriceCents: number;
  hasPromo: boolean;
};

type Shop = {
  id: string;
  name: string;
  description: string;
  category: string;
  city: string;
  country: string;
  currency: string;
  status: string;
  canReceivePayments?: boolean;
  isOwner?: boolean;
  products: Product[];
};

type Order = {
  id: string;
  status: string;
  amountCents: number;
  currency: string;
  quantity: number;
  createdAt: string;
  product: { title: string };
  buyer: { displayName: string };
};

function fromCents(cents: number, currency: string) {
  const code = currency.toUpperCase();
  if (code === "XOF" || code === "XAF") return String(cents);
  return (cents / 100).toFixed(2);
}

function toDateInput(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function ManageShopPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useI18n();
  const [shop, setShop] = useState<Shop | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [promoPrice, setPromoPrice] = useState("");
  const [promoLabel, setPromoLabel] = useState("");
  const [promoEndsAt, setPromoEndsAt] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [warranty, setWarranty] = useState("");
  const [stockQty, setStockQty] = useState("");
  const [highlights, setHighlights] = useState("");
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    const [shopRes, ordersRes] = await Promise.all([
      fetch(`/api/shops/${id}`),
      fetch("/api/shops/orders?role=seller"),
    ]);
    const shopData = await shopRes.json();
    const ordersData = await ordersRes.json();
    if (!shopRes.ok) {
      setError(shopData.error ?? "Erreur");
      return;
    }
    setShop(shopData.shop);
    setOrders(
      (ordersData.orders ?? []).filter(
        (o: { shop?: { id: string } }) => o.shop?.id === id
      )
    );
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setPrice("");
    setPromoPrice("");
    setPromoLabel("");
    setPromoEndsAt("");
    setPhotoUrl(null);
    setWarranty("");
    setStockQty("");
    setHighlights("");
  }

  function startEdit(p: Product, currency: string) {
    setEditingId(p.id);
    setTitle(p.title);
    setDescription(p.description ?? "");
    setPrice(fromCents(p.priceCents, currency));
    setPromoPrice(
      p.promoPriceCents != null ? fromCents(p.promoPriceCents, currency) : ""
    );
    setPromoLabel(p.promoLabel ?? "");
    setPromoEndsAt(toDateInput(p.promoEndsAt));
    setPhotoUrl(p.photoUrl);
    setWarranty(p.warranty ?? "");
    setStockQty(p.stockQty != null ? String(p.stockQty) : "");
    setHighlights(p.highlights ?? "");
    setError("");
    setMessage("");
    document.getElementById("product-form")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  async function uploadPhoto(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    if (res.ok) setPhotoUrl(data.url);
    else setError(data.error ?? "Upload échoué");
  }

  function productPayload() {
    return {
      title,
      description,
      price: Number(price),
      promoPrice: promoPrice ? Number(promoPrice) : null,
      promoLabel: promoLabel || null,
      promoEndsAt: promoEndsAt || null,
      photoUrl,
      ...(shopCategoryHasElectronicsSpecs(shop?.category ?? "")
        ? {
            warranty: warranty || null,
            stockQty: stockQty === "" ? null : Number(stockQty),
            highlights: highlights || null,
          }
        : {}),
    };
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    const isEdit = Boolean(editingId);
    const res = await fetch(
      isEdit ? `/api/shops/products/${editingId}` : `/api/shops/${id}/products`,
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productPayload()),
      }
    );
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Erreur");
      return;
    }
    resetForm();
    setMessage(
      isEdit ? t("shops_product_updated") : t("shops_save_product")
    );
    await load();
  }

  async function shopAction(action: "publish" | "close" | "draft") {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/shops/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Erreur");
      return;
    }
    await load();
  }

  async function toggleProduct(productId: string, active: boolean) {
    await fetch(`/api/shops/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    await load();
  }

  async function fulfill(orderId: string) {
    await fetch(`/api/shops/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "fulfill" }),
    });
    await load();
  }

  if (!shop) {
    return (
      <p className="text-sm text-[var(--muted)]">
        {error || t("loading")}
      </p>
    );
  }

  const loc = locale === "en" ? "en-CA" : "fr-CA";
  const editing = Boolean(editingId);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/shops" className="text-sm text-[var(--accent)]">
          ← {t("shops_title")}
        </Link>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold">
          {shop.name}
        </h1>
        <p className="text-[var(--muted)]">
          {shopCategoryLabel(shop.category, locale)} · {shop.city}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge>
            {shop.status === "OPEN"
              ? t("shops_status_open")
              : shop.status === "CLOSED"
                ? t("shops_status_closed")
                : t("shops_status_draft")}
          </Badge>
          <Link href={`/shops/${shop.id}`}>
            <Button size="sm" variant="outline">
              {t("shops_view_shop")}
            </Button>
          </Link>
        </div>
      </div>

      {!shop.canReceivePayments && (
        <Card className="border-amber-300/50 bg-amber-50/40">
          <CardDescription>{t("shops_payouts_required")}</CardDescription>
          <Link href="/profile" className="mt-3 inline-block">
            <Button size="sm">{t("nav_profile")}</Button>
          </Link>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {shop.status !== "OPEN" && (
          <Button
            disabled={busy}
            onClick={() => void shopAction("publish")}
          >
            {t("shops_publish")}
          </Button>
        )}
        {shop.status === "OPEN" && (
          <>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void shopAction("draft")}
            >
              {t("shops_unpublish")}
            </Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => void shopAction("close")}
            >
              {t("shops_close")}
            </Button>
          </>
        )}
      </div>

      <Card id="product-form">
        <CardTitle>
          {editing ? t("shops_editing_product") : t("shops_add_product")}
        </CardTitle>
        {editing && (
          <CardDescription className="mt-1">
            {title || "…"}
          </CardDescription>
        )}
        <form onSubmit={saveProduct} className="mt-4 space-y-3">
          <div className="space-y-1">
            <Label>{t("shops_product_title")}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label>{t("shops_product_desc")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>
                {t("shops_price")} ({shop.currency})
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>{t("shops_promo_price")}</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={promoPrice}
                onChange={(e) => setPromoPrice(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>{t("shops_promo_label")}</Label>
              <Input
                value={promoLabel}
                onChange={(e) => setPromoLabel(e.target.value)}
                placeholder="-20%"
              />
            </div>
            <div className="space-y-1">
              <Label>{t("shops_promo_ends")}</Label>
              <Input
                type="date"
                value={promoEndsAt}
                onChange={(e) => setPromoEndsAt(e.target.value)}
              />
            </div>
          </div>
          {shopCategoryHasElectronicsSpecs(shop.category) && (
            <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                {t("shops_electronics_specs")}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>{t("shops_warranty")}</Label>
                  <Input
                    value={warranty}
                    onChange={(e) => setWarranty(e.target.value)}
                    placeholder={t("shops_warranty_placeholder")}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("shops_stock")}</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={stockQty}
                    onChange={(e) => setStockQty(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>{t("shops_highlights")}</Label>
                <Textarea
                  value={highlights}
                  onChange={(e) => setHighlights(e.target.value)}
                  rows={3}
                  placeholder={t("shops_highlights_placeholder")}
                />
              </div>
            </div>
          )}
          <div className="space-y-1">
            <Label>{t("shops_product_photo")}</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadPhoto(f);
              }}
            />
            {uploading && (
              <p className="text-xs text-[var(--muted)]">{t("loading")}</p>
            )}
            {photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt=""
                className="mt-2 h-24 w-24 rounded-md object-cover"
              />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>
              {editing ? t("shops_update_product") : t("shops_save_product")}
            </Button>
            {editing && (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  resetForm();
                  setMessage("");
                }}
              >
                {t("shops_cancel_edit")}
              </Button>
            )}
          </div>
        </form>
      </Card>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("shops_products")}</h2>
        {shop.products.length === 0 && (
          <p className="text-sm text-[var(--muted)]">{t("shops_need_product")}</p>
        )}
        {shop.products.map((p) => (
          <Card
            key={p.id}
            className={
              editingId === p.id
                ? "border-[var(--accent)]/50"
                : undefined
            }
          >
            <div className="flex gap-3">
              {p.photoUrl && (
                <div className="flex h-24 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[var(--surface-2)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.photoUrl}
                    alt=""
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              )}
              <div className="flex-1">
                <CardTitle className="text-base">{p.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {p.description}
                </CardDescription>
                <p className="mt-1 text-sm">
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
                  {!p.active && (
                    <Badge className="ml-2">{t("shops_status_closed")}</Badge>
                  )}
                </p>
                {shopCategoryHasElectronicsSpecs(shop.category) && (
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {p.warranty
                      ? `${t("shops_warranty")}: ${p.warranty}`
                      : null}
                    {p.warranty && p.stockQty != null ? " · " : null}
                    {p.stockQty != null
                      ? `${t("shops_stock")}: ${p.stockQty}`
                      : null}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => startEdit(p, shop.currency)}
                  >
                    {t("shops_edit_product")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void toggleProduct(p.id, !p.active)}
                  >
                    {p.active ? t("shops_deactivate") : t("shops_activate")}
                  </Button>
                  <Link href={`/shops/product/${p.id}`}>
                    <Button size="sm" variant="ghost">
                      Voir
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("shops_seller_orders")}</h2>
        {orders.length === 0 && (
          <p className="text-sm text-[var(--muted)]">—</p>
        )}
        {orders.map((o) => (
          <Card key={o.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">{o.product.title}</CardTitle>
                <CardDescription>
                  {o.buyer.displayName} · x{o.quantity} ·{" "}
                  {formatMoneyFromCents(o.amountCents, o.currency, loc)}
                </CardDescription>
                <Badge className="mt-2">
                  {shopOrderStatusLabel(o.status, locale)}
                </Badge>
              </div>
              {o.status === "PAID" && (
                <Button size="sm" onClick={() => void fulfill(o.id)}>
                  {t("shops_fulfill")}
                </Button>
              )}
              <Link href={`/shops/orders/${o.id}`}>
                <Button size="sm" variant="outline">
                  Détail
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="mt-0 text-sm text-[var(--accent)]">{message}</p>}
    </div>
  );
}
