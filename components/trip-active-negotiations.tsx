"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/locale-provider";
import { formatMoney, normalizeCurrency, type MoneyCurrency } from "@/lib/currency";

type Negotiation = {
  id: string;
  tripId: string;
  status: string;
  offeredPricePerKg: number | null;
  sender: { displayName: string };
  request: { fromCity: string; toCity: string; weightKg: number };
  trip: { pricePerKgCad: number; currency: string };
};

export function TripActiveNegotiations({ tripId }: { tripId: string }) {
  const { t, bookingStatus } = useI18n();
  const [items, setItems] = useState<Negotiation[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/bookings?as=traveler");
      const data = await res.json();
      if (res.ok) {
        const list = ((data.bookings ?? []) as Negotiation[])
          .filter((b) => b.tripId === tripId)
          .filter((b) =>
            ["PROPOSED", "AWAITING_PAYMENT"].includes(b.status)
          )
          .sort((a, b) => {
            const pa = a.offeredPricePerKg ?? a.trip.pricePerKgCad;
            const pb = b.offeredPricePerKg ?? b.trip.pricePerKgCad;
            return pb - pa;
          });
        setItems(list);
      }
      setLoaded(true);
    })();
  }, [tripId]);

  if (!loaded || items.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
        {t("negotiation_in_progress")} ({items.length})
      </h2>
      <p className="text-sm text-[var(--muted)]">{t("offers_ranked_hint")}</p>
      {items.map((b) => {
        const currency = (normalizeCurrency(b.trip.currency) ??
          "CAD") as MoneyCurrency;
        const offer = b.offeredPricePerKg;
        return (
          <Card key={b.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">
                  {b.sender.displayName}
                </CardTitle>
                <CardDescription>
                  {b.request.fromCity} → {b.request.toCity} · {b.request.weightKg}{" "}
                  kg
                </CardDescription>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge>{bookingStatus(b.status)}</Badge>
                  {offer != null ? (
                    <Badge className="bg-[var(--accent)] text-white">
                      {t("current_offer")}: {formatMoney(offer, currency)}/kg
                    </Badge>
                  ) : (
                    <Badge>
                      {formatMoney(b.trip.pricePerKgCad, currency)}/kg
                    </Badge>
                  )}
                </div>
              </div>
              <Link href={`/bookings/${b.id}`}>
                <Button size="sm">{t("open_booking")}</Button>
              </Link>
            </div>
          </Card>
        );
      })}
    </section>
  );
}
