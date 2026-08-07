"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useI18n } from "@/components/locale-provider";
import { MediaGallery } from "@/components/media-gallery";
import { FormattedDescription } from "@/components/formatted-description";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  photos?: string[];
  warranty: string | null;
  stockQty: number | null;
  highlights: string | null;
  effectivePriceCents: number;
  hasPromo: boolean;
  promoLabel: string | null;
  isOwner?: boolean;
  shop: {
    id: string;
    name: string;
    category: string;
    currency: string;
    status: string;
    user: { displayName: string };
  };
};

function ProductBuyForm() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { t, locale } = useI18n();
  const [product, setProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (searchParams.get("payment") === "cancel") {
      setError(
        locale === "en" ? "Payment cancelled." : "Paiement annulé."
      );
    }
  }, [searchParams, locale]);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/shops/products/${id}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur");
        return;
      }
      setProduct(data.product);
    })();
  }, [id]);

  async function buy() {
    if (!product) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/shops/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id, quantity: qty }),
    });
    const data = await res.json();
    if (!res.ok) {
      setBusy(false);
      setError(data.error ?? "Paiement impossible");
      return;
    }
    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
      return;
    }
    setBusy(false);
    setError("URL de paiement manquante");
  }

  if (!product && !error) {
    return <p className="text-sm text-[var(--muted)]">{t("loading")}</p>;
  }
  if (!product) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  const loc = locale === "en" ? "en-CA" : "fr-CA";
  const isElectronics = shopCategoryHasElectronicsSpecs(
    product.shop.category
  );
  const outOfStock =
    isElectronics && product.stockQty != null && product.stockQty <= 0;
  const maxQty =
    isElectronics && product.stockQty != null
      ? Math.min(20, product.stockQty)
      : 20;
  const canBuy =
    !product.isOwner && product.shop.status === "OPEN" && !outOfStock;

  const gallery =
    product.photos && product.photos.length > 0
      ? product.photos
      : product.photoUrl
        ? [product.photoUrl]
        : [];

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link
        href={`/shops/${product.shop.id}`}
        className="text-sm text-[var(--accent)]"
      >
        ← {product.shop.name}
      </Link>
      <Card>
        {gallery.length > 0 && (
          <div className="mb-4">
            <MediaGallery photos={gallery} alt={product.title} />
          </div>
        )}
        <CardTitle className="text-2xl">{product.title}</CardTitle>
        <CardDescription className="mt-1">
          {shopCategoryLabel(product.shop.category, locale)} ·{" "}
          {product.shop.user.displayName}
        </CardDescription>
        <FormattedDescription
          text={product.description}
          className="mt-4"
        />

        {isElectronics &&
          (product.warranty ||
            product.stockQty != null ||
            product.highlights) && (
            <div className="mt-4 space-y-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/50 p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                {t("shops_electronics_specs")}
              </p>
              {product.warranty && (
                <p>
                  <span className="text-[var(--muted)]">
                    {t("shops_warranty")} :{" "}
                  </span>
                  {product.warranty}
                </p>
              )}
              {product.stockQty != null && (
                <p>
                  <span className="text-[var(--muted)]">
                    {t("shops_stock")} :{" "}
                  </span>
                  {product.stockQty > 0
                    ? `${product.stockQty} — ${t("shops_stock_available")}`
                    : t("shops_stock_out")}
                </p>
              )}
              {product.highlights && (
                <div>
                  <p className="text-[var(--muted)]">{t("shops_highlights")}</p>
                  <FormattedDescription
                    text={product.highlights}
                    className="mt-1"
                    dense
                  />
                </div>
              )}
            </div>
          )}

        <p className="mt-4 text-lg">
          {product.hasPromo && (
            <span className="mr-2 text-[var(--muted)] line-through">
              {formatMoneyFromCents(
                product.priceCents,
                product.shop.currency,
                loc
              )}
            </span>
          )}
          <span className="font-semibold text-[var(--accent)]">
            {formatMoneyFromCents(
              product.effectivePriceCents,
              product.shop.currency,
              loc
            )}
          </span>
          {product.promoLabel && (
            <Badge className="ml-2">{product.promoLabel}</Badge>
          )}
        </p>

        {outOfStock && (
          <Badge className="mt-3">{t("shops_stock_out")}</Badge>
        )}

        {canBuy && (
          <div className="mt-6 space-y-3">
            <div className="space-y-1">
              <Label htmlFor="qty">{t("shops_qty")}</Label>
              <Input
                id="qty"
                type="number"
                min={1}
                max={maxQty}
                value={qty}
                onChange={(e) =>
                  setQty(Math.min(maxQty, Number(e.target.value) || 1))
                }
                className="max-w-[120px]"
              />
            </div>
            <Button
              className="w-full"
              disabled={busy}
              onClick={() => void buy()}
            >
              {busy ? t("shops_buying") : t("shops_buy")}
            </Button>
          </div>
        )}
        {product.isOwner && (
          <Link
            href={`/shops/${product.shop.id}/manage`}
            className="mt-4 inline-block"
          >
            <Button variant="outline">{t("shops_manage")}</Button>
          </Link>
        )}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </Card>
    </div>
  );
}

export default function ShopProductPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">…</p>}>
      <ProductBuyForm />
    </Suspense>
  );
}
