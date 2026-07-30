"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useI18n } from "@/components/locale-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { formatMoneyFromCents } from "@/lib/currency";
import { shopOrderStatusLabel } from "@/lib/shops-catalog";

type Order = {
  id: string;
  status: string;
  quantity: number;
  unitPriceCents: number;
  amountCents: number;
  platformFeeCents: number;
  sellerPayoutCents: number;
  currency: string;
  createdAt: string;
  product: { id: string; title: string; photoUrl: string | null };
  shop: { id: string; name: string; userId: string };
  buyer: { displayName: string; email: string };
};

function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { t, locale } = useI18n();
  const [order, setOrder] = useState<Order | null>(null);
  const [isSeller, setIsSeller] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch(`/api/shops/orders/${id}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Erreur");
      return;
    }
    setOrder(data.order);
    setIsSeller(Boolean(data.isSeller));
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (searchParams.get("paid") !== "1") return;
    setMessage(t("shops_order_paid"));
    void (async () => {
      await fetch(`/api/shops/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_paid" }),
      });
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, id]);

  async function fulfill() {
    const res = await fetch(`/api/shops/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "fulfill" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Erreur");
      return;
    }
    await load();
  }

  if (!order && !error) {
    return <p className="text-sm text-[var(--muted)]">{t("loading")}</p>;
  }
  if (!order) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  const loc = locale === "en" ? "en-CA" : "fr-CA";

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link href="/shops/orders" className="text-sm text-[var(--accent)]">
        ← {t("shops_orders")}
      </Link>
      <Card>
        <CardTitle>{order.product.title}</CardTitle>
        <CardDescription className="mt-1">
          {order.shop.name} · {order.buyer.displayName}
        </CardDescription>
        <Badge className="mt-3">
          {shopOrderStatusLabel(order.status, locale)}
        </Badge>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--muted)]">{t("shops_qty")}</dt>
            <dd>{order.quantity}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--muted)]">Total</dt>
            <dd className="font-semibold">
              {formatMoneyFromCents(order.amountCents, order.currency, loc)}
            </dd>
          </div>
          {isSeller && (
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted)]">Votre gain (estim.)</dt>
              <dd>
                {formatMoneyFromCents(
                  order.sellerPayoutCents,
                  order.currency,
                  loc
                )}
              </dd>
            </div>
          )}
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/shops/${order.shop.id}`}>
            <Button variant="outline" size="sm">
              {t("shops_view_shop")}
            </Button>
          </Link>
          {isSeller && order.status === "PAID" && (
            <Button size="sm" onClick={() => void fulfill()}>
              {t("shops_fulfill")}
            </Button>
          )}
        </div>
        {message && (
          <p className="mt-3 text-sm text-[var(--accent)]">{message}</p>
        )}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </Card>
    </div>
  );
}

export default function ShopOrderPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">…</p>}>
      <OrderDetail />
    </Suspense>
  );
}
