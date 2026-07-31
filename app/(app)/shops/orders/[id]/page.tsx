"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { CountryCodeSelect } from "@/components/country-select";
import { useI18n } from "@/components/locale-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCities, getCountryName } from "@/lib/corridors";
import { formatMoneyFromCents } from "@/lib/currency";
import { bookingStatusLabel } from "@/lib/i18n";
import {
  shopDeliveryModeLabel,
  shopOrderStatusLabel,
} from "@/lib/shops-catalog";

type ParcelRequest = {
  id: string;
  status: string;
  fromCountry: string;
  fromCity: string;
  toCountry: string;
  toCity: string;
  bookings: { id: string; status: string }[];
};

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
  deliveryToCountry: string | null;
  deliveryToCity: string | null;
  deliveryMode: string;
  parcelRequestId: string | null;
  product: { id: string; title: string; photoUrl: string | null };
  shop: {
    id: string;
    name: string;
    userId: string;
    city: string;
    country: string;
  };
  buyer: { displayName: string; email: string };
  parcelRequest: ParcelRequest | null;
};

type TripHit = {
  tripId: string;
  score: number;
  fromCountry: string;
  fromCity: string;
  toCountry: string;
  toCity: string;
  departAt: string;
  weightKg: number;
  pricePerKgCad: number;
  currency: string;
  user: {
    displayName: string;
    ratingAvg: number;
    ratingCount: number;
  };
};

type ServiceHit = {
  id: string;
  title: string;
  category: string;
  city: string;
  country: string;
  user: { displayName: string };
};

function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { t, locale } = useI18n();
  const [order, setOrder] = useState<Order | null>(null);
  const [isSeller, setIsSeller] = useState(false);
  const [isBuyer, setIsBuyer] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [toCountry, setToCountry] = useState("CA");
  const [toCity, setToCity] = useState("");
  const [weightKg, setWeightKg] = useState("1");
  const [savingDelivery, setSavingDelivery] = useState(false);
  const [trips, setTrips] = useState<TripHit[]>([]);
  const [services, setServices] = useState<ServiceHit[]>([]);
  const [loadingCarriers, setLoadingCarriers] = useState(false);

  const citySuggestions = useMemo(() => getCities(toCountry), [toCountry]);

  async function load() {
    const res = await fetch(`/api/shops/orders/${id}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Erreur");
      return;
    }
    setOrder(data.order);
    setIsSeller(Boolean(data.isSeller));
    setIsBuyer(Boolean(data.isBuyer));
    if (data.order?.deliveryToCountry) {
      setToCountry(data.order.deliveryToCountry);
    }
    if (data.order?.deliveryToCity) {
      setToCity(data.order.deliveryToCity);
    }
  }

  async function loadCarriers() {
    setLoadingCarriers(true);
    const res = await fetch(`/api/shops/orders/${id}/carriers`);
    const data = await res.json();
    setLoadingCarriers(false);
    if (!res.ok) {
      setError(data.error ?? "Erreur");
      return;
    }
    setTrips(data.trips ?? []);
    setServices(data.services ?? []);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!order?.deliveryToCountry || !order.deliveryToCity) return;
    if (order.deliveryMode === "NONE") return;
    void loadCarriers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id, order?.deliveryMode, order?.deliveryToCountry, order?.deliveryToCity]);

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

  async function chooseDelivery(mode: "MATCH_ONLY" | "PARCEL_PAID") {
    setSavingDelivery(true);
    setError("");
    const weight = Number(weightKg);
    const res = await fetch(`/api/shops/orders/${id}/delivery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toCountry,
        toCity: toCity.trim(),
        mode,
        weightKg: Number.isFinite(weight) && weight > 0 ? weight : 1,
      }),
    });
    const data = await res.json();
    setSavingDelivery(false);
    if (!res.ok) {
      setError(data.error ?? "Erreur");
      return;
    }
    setOrder(data.order);
    setMessage(
      mode === "PARCEL_PAID"
        ? t("shops_delivery_parcel_created")
        : t("shops_delivery_match_saved")
    );
  }

  if (!order && !error) {
    return <p className="text-sm text-[var(--muted)]">{t("loading")}</p>;
  }
  if (!order) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  const loc = locale === "en" ? "en-CA" : "fr-CA";
  const needsDeliverySetup =
    isBuyer &&
    (order.status === "PAID" || order.status === "FULFILLED") &&
    order.deliveryMode === "NONE";
  const hasDelivery = order.deliveryMode !== "NONE";
  const booking = order.parcelRequest?.bookings?.[0];

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
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--muted)]">{t("shops_delivery_origin")}</dt>
            <dd>
              {order.shop.city}, {getCountryName(order.shop.country)}
            </dd>
          </div>
          {hasDelivery && (
            <>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--muted)]">
                  {t("shops_delivery_destination")}
                </dt>
                <dd>
                  {order.deliveryToCity},{" "}
                  {getCountryName(order.deliveryToCountry ?? "")}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--muted)]">
                  {t("shops_delivery_mode")}
                </dt>
                <dd>{shopDeliveryModeLabel(order.deliveryMode, locale)}</dd>
              </div>
              {booking ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--muted)]">
                    {t("shops_delivery_booking")}
                  </dt>
                  <dd>{bookingStatusLabel(locale, booking.status)}</dd>
                </div>
              ) : order.deliveryMode === "MATCH_ONLY" ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--muted)]">
                    {t("shops_delivery_status")}
                  </dt>
                  <dd>{t("shops_delivery_to_arrange")}</dd>
                </div>
              ) : null}
            </>
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
          {isBuyer && order.parcelRequestId && (
            <Link href={`/requests/${order.parcelRequestId}`}>
              <Button size="sm" variant="outline">
                {t("shops_delivery_open_request")}
              </Button>
            </Link>
          )}
        </div>
        {message && (
          <p className="mt-3 text-sm text-[var(--accent)]">{message}</p>
        )}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </Card>

      {needsDeliverySetup && (
        <Card>
          <CardTitle className="text-lg">{t("shops_delivery_title")}</CardTitle>
          <CardDescription className="mt-1">
            {t("shops_delivery_subtitle")}
          </CardDescription>
          <div className="mt-4 space-y-3">
            <CountryCodeSelect
              name="toCountry"
              label={t("shops_delivery_to_country")}
              value={toCountry}
              onChange={setToCountry}
            />
            <div className="space-y-2">
              <Label htmlFor="toCity">{t("shops_delivery_to_city")}</Label>
              <Input
                id="toCity"
                list="shop-delivery-cities"
                value={toCity}
                onChange={(e) => setToCity(e.target.value)}
                placeholder={t("shops_delivery_to_city")}
                required
              />
              <datalist id="shop-delivery-cities">
                {citySuggestions.map((city) => (
                  <option key={city} value={city} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="weightKg">{t("shops_delivery_weight")}</Label>
              <Input
                id="weightKg"
                type="number"
                min={0.1}
                step={0.1}
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                disabled={savingDelivery || !toCity.trim()}
                variant="outline"
                onClick={() => void chooseDelivery("MATCH_ONLY")}
              >
                {t("shops_delivery_match_only")}
              </Button>
              <Button
                disabled={savingDelivery || !toCity.trim()}
                onClick={() => void chooseDelivery("PARCEL_PAID")}
              >
                {t("shops_delivery_parcel_paid")}
              </Button>
            </div>
            <p className="text-xs text-[var(--muted)]">
              {t("shops_delivery_options_hint")}
            </p>
          </div>
        </Card>
      )}

      {hasDelivery && (
        <Card>
          <CardTitle className="text-lg">{t("shops_delivery_carriers")}</CardTitle>
          <CardDescription className="mt-1">
            {order.shop.city}, {getCountryName(order.shop.country)} →{" "}
            {order.deliveryToCity},{" "}
            {getCountryName(order.deliveryToCountry ?? "")}
          </CardDescription>
          {loadingCarriers && (
            <p className="mt-3 text-sm text-[var(--muted)]">{t("loading")}</p>
          )}
          {!loadingCarriers && trips.length === 0 && services.length === 0 && (
            <p className="mt-3 text-sm text-[var(--muted)]">
              {t("shops_delivery_no_carriers")}
            </p>
          )}
          <div className="mt-3 space-y-3">
            {trips.map((trip) => (
              <div
                key={trip.tripId}
                className="flex flex-wrap items-start justify-between gap-2 border-t border-[var(--border)] pt-3 first:border-0 first:pt-0"
              >
                <div className="text-sm">
                  <p className="font-medium">{trip.user.displayName}</p>
                  <p className="text-[var(--muted)]">
                    {trip.fromCity} → {trip.toCity} ·{" "}
                    {new Date(trip.departAt).toLocaleDateString(loc)}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {trip.weightKg} kg · score {trip.score}
                    {trip.user.ratingCount > 0
                      ? ` · ★ ${trip.user.ratingAvg.toFixed(1)}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/trips/${trip.tripId}`}>
                    <Button size="sm" variant="outline">
                      {t("shops_delivery_view_trip")}
                    </Button>
                  </Link>
                  {order.deliveryMode === "PARCEL_PAID" &&
                    order.parcelRequestId && (
                      <Link href={`/trips/${trip.tripId}#propose`}>
                        <Button size="sm">{t("shops_delivery_propose")}</Button>
                      </Link>
                    )}
                </div>
              </div>
            ))}
            {services.map((svc) => (
              <div
                key={svc.id}
                className="flex flex-wrap items-start justify-between gap-2 border-t border-[var(--border)] pt-3"
              >
                <div className="text-sm">
                  <p className="font-medium">{svc.title}</p>
                  <p className="text-[var(--muted)]">
                    {svc.user.displayName} · {svc.city},{" "}
                    {getCountryName(svc.country)}
                  </p>
                </div>
                <Link href={`/services/listing/${svc.id}`}>
                  <Button size="sm" variant="outline">
                    {t("shops_delivery_view_service")}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
          {isBuyer && order.parcelRequestId && (
            <div className="mt-4">
              <Link href={`/requests/${order.parcelRequestId}`}>
                <Button variant="outline" size="sm">
                  {t("shops_delivery_open_request")}
                </Button>
              </Link>
            </div>
          )}
        </Card>
      )}
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
