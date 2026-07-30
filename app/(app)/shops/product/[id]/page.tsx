"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useI18n } from "@/components/locale-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const canBuy =
    !product.isOwner && product.shop.status === "OPEN";

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link
        href={`/shops/${product.shop.id}`}
        className="text-sm text-[var(--accent)]"
      >
        ← {product.shop.name}
      </Link>
      <Card>
        {product.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.photoUrl}
            alt=""
            className="mb-4 h-56 w-full rounded-md object-cover"
          />
        )}
        <CardTitle className="text-2xl">{product.title}</CardTitle>
        <CardDescription className="mt-1">
          {shopCategoryLabel(product.shop.category, locale)} ·{" "}
          {product.shop.user.displayName}
        </CardDescription>
        <p className="mt-4 text-sm leading-relaxed">{product.description}</p>
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

        {canBuy && (
          <div className="mt-6 space-y-3">
            <div className="space-y-1">
              <Label htmlFor="qty">{t("shops_qty")}</Label>
              <Input
                id="qty"
                type="number"
                min={1}
                max={20}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value) || 1)}
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
