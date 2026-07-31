"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/locale-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { formatMoneyFromCents } from "@/lib/currency";
import {
  shopDeliveryModeLabel,
  shopOrderStatusLabel,
} from "@/lib/shops-catalog";

type Order = {
  id: string;
  status: string;
  amountCents: number;
  currency: string;
  quantity: number;
  createdAt: string;
  deliveryMode?: string;
  deliveryToCity?: string | null;
  deliveryToCountry?: string | null;
  parcelRequestId?: string | null;
  product: { id: string; title: string; photoUrl: string | null };
  shop: { id: string; name: string };
};

export default function ShopOrdersPage() {
  const { t, locale } = useI18n();
  const [orders, setOrders] = useState<Order[]>([]);
  const [sellerOrders, setSellerOrders] = useState<Order[]>([]);

  useEffect(() => {
    void (async () => {
      const [buyer, seller] = await Promise.all([
        fetch("/api/shops/orders").then((r) => r.json()),
        fetch("/api/shops/orders?role=seller").then((r) => r.json()),
      ]);
      if (buyer.orders) setOrders(buyer.orders);
      if (seller.orders) setSellerOrders(seller.orders);
    })();
  }, []);

  const loc = locale === "en" ? "en-CA" : "fr-CA";

  function OrderList({ items }: { items: Order[] }) {
    if (items.length === 0) {
      return <p className="text-sm text-[var(--muted)]">—</p>;
    }
    return (
      <div className="space-y-3">
        {items.map((o) => (
          <Card key={o.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">{o.product.title}</CardTitle>
                <CardDescription>
                  {o.shop.name} · x{o.quantity} ·{" "}
                  {formatMoneyFromCents(o.amountCents, o.currency, loc)}
                </CardDescription>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge>{shopOrderStatusLabel(o.status, locale)}</Badge>
                  {o.deliveryMode && o.deliveryMode !== "NONE" && (
                    <Badge className="border border-[var(--border)] bg-transparent">
                      {shopDeliveryModeLabel(o.deliveryMode, locale)}
                      {o.deliveryToCity ? ` · ${o.deliveryToCity}` : ""}
                    </Badge>
                  )}
                </div>
              </div>
              <Link href={`/shops/orders/${o.id}`}>
                <Button size="sm" variant="outline">
                  Détail
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link href="/shops" className="text-sm text-[var(--accent)]">
          ← {t("shops_title")}
        </Link>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold">
          {t("shops_orders")}
        </h1>
      </div>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("shops_orders")}</h2>
        <OrderList items={orders} />
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("shops_seller_orders")}</h2>
        <OrderList items={sellerOrders} />
      </section>
    </div>
  );
}
