"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CorridorFields,
  DateField,
  combineDateAndTime,
  toDateInput,
  toTimeInput,
} from "@/components/corridor-fields";
import { TransportFields } from "@/components/transport-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { CURRENCY_OPTIONS, resolveCheckoutCurrency } from "@/lib/currency";
import type { TransportMode } from "@/lib/transport";
import { useI18n } from "@/components/locale-provider";

export default function EditTripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [id, setId] = useState("");
  const [trip, setTrip] = useState<{
    fromCountry: string;
    fromCity: string;
    toCountry: string;
    toCity: string;
    departAt: string;
    arriveAt?: string | null;
    weightKg: number;
    pricePerKgCad: number;
    currency: string;
    transportMode?: string;
    transportType?: string | null;
    acceptedGoods: string;
    notes: string | null;
    airline: string | null;
    flightNumber: string | null;
    fromAirportCode: string | null;
    toAirportCode: string | null;
    priceNegotiable?: boolean;
    userId: string;
    status: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [fromCountry, setFromCountry] = useState("CA");
  const [toCountry, setToCountry] = useState("FR");
  const [transportMode, setTransportMode] = useState<TransportMode>("AIR");

  useEffect(() => {
    void params.then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      const [tripRes, meRes] = await Promise.all([
        fetch(`/api/trips/${id}`),
        fetch("/api/auth/me"),
      ]);
      const tripData = await tripRes.json();
      const meData = await meRes.json();
      if (!tripRes.ok) {
        setError(tripData.error ?? "Erreur");
        return;
      }
      const meId = meData.user?.id;
      if (
        meId &&
        tripData.trip.userId !== meId &&
        meData.user?.role !== "ADMIN"
      ) {
        setForbidden(true);
        return;
      }
      setTrip(tripData.trip);
      setFromCountry(tripData.trip.fromCountry);
      setToCountry(tripData.trip.toCountry);
      setTransportMode(
        (tripData.trip.transportMode as TransportMode) || "AIR"
      );
    })();
  }, [id]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!trip) return;
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const fromCountry = String(fd.get("fromCountry"));
    const toCountry = String(fd.get("toCountry"));
    const currency =
      String(fd.get("currency") || "") ||
      resolveCheckoutCurrency(fromCountry, toCountry);
    const departAt = combineDateAndTime(
      String(fd.get("departDate") || ""),
      String(fd.get("departTime") || "")
    );
    const arriveAt = combineDateAndTime(
      String(fd.get("arriveDate") || ""),
      String(fd.get("arriveTime") || "")
    );
    if (!departAt || !arriveAt) {
      setLoading(false);
      setError("Indiquez date et heure de départ et d'arrivée.");
      return;
    }
    if (arriveAt.getTime() < departAt.getTime()) {
      setLoading(false);
      setError("La date d'arrivée doit être après le départ.");
      return;
    }
    const payload = {
      fromCountry,
      fromCity: String(fd.get("fromCity")),
      toCountry,
      toCity: String(fd.get("toCity")),
      departAt: departAt.toISOString(),
      arriveAt: arriveAt.toISOString(),
      weightKg: Number(fd.get("weightKg")),
      pricePerKgCad: Number(fd.get("pricePerKgCad")),
      currency,
      transportMode: String(fd.get("transportMode") || transportMode),
      transportType: String(fd.get("transportType") || "") || null,
      acceptedGoods: String(fd.get("acceptedGoods")),
      notes: String(fd.get("notes") || "") || null,
      airline: String(fd.get("airline") || "") || null,
      flightNumber: String(fd.get("flightNumber") || "") || null,
      fromAirportCode: String(fd.get("fromAirportCode") || "") || null,
      toAirportCode: String(fd.get("toAirportCode") || "") || null,
      priceNegotiable: fd.get("priceNegotiable") === "true",
    };

    const res = await fetch(`/api/trips/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Erreur");
      return;
    }
    router.push(`/trips/${id}`);
    router.refresh();
  }

  if (forbidden) {
    return <p className="text-sm text-red-700">Interdit</p>;
  }
  if (!trip) {
    return <p className="text-sm text-[var(--muted)]">{t("loading")}</p>;
  }

  const arriveSource = trip.arriveAt || trip.departAt;

  return (
    <Card className="max-w-2xl">
      <CardTitle>{t("edit_trip")}</CardTitle>
      <CardDescription>
        {trip.fromCity} → {trip.toCity}
      </CardDescription>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <CorridorFields
          defaults={{
            fromCountry: trip.fromCountry,
            fromCity: trip.fromCity,
            toCountry: trip.toCountry,
            toCity: trip.toCity,
          }}
          onFromCountryChange={setFromCountry}
          onToCountryChange={setToCountry}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <DateField
            name="departDate"
            label={t("departure_date")}
            type="date"
            required
            defaultValue={toDateInput(trip.departAt)}
          />
          <DateField
            name="departTime"
            label={t("departure_time")}
            type="time"
            required
            defaultValue={toTimeInput(trip.departAt)}
          />
          <DateField
            name="arriveDate"
            label={t("arrival_date")}
            type="date"
            required
            defaultValue={toDateInput(arriveSource)}
          />
          <DateField
            name="arriveTime"
            label={t("arrival_time")}
            type="time"
            required
            defaultValue={toTimeInput(arriveSource)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="weightKg">{t("weight_available")}</Label>
            <Input
              id="weightKg"
              name="weightKg"
              type="number"
              step="0.5"
              min="0.5"
              required
              defaultValue={trip.weightKg}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pricePerKgCad">{t("price_per_kg")}</Label>
            <Input
              id="pricePerKgCad"
              name="pricePerKgCad"
              type="number"
              step="0.5"
              min="1"
              required
              defaultValue={trip.pricePerKgCad}
            />
            <p className="text-xs text-[var(--muted)]">{t("price_per_kg_hint")}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">{t("currency")}</Label>
            <Select
              id="currency"
              name="currency"
              defaultValue={trip.currency || "CAD"}
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </Select>
            <p className="text-xs text-[var(--muted)]">{t("trip_currency_hint")}</p>
          </div>
        </div>
        <fieldset className="space-y-2 rounded-lg border border-[var(--border)] p-4">
          <legend className="px-1 text-sm font-medium">
            {t("price_policy")}
          </legend>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="priceNegotiable"
              value="false"
              defaultChecked={!trip.priceNegotiable}
              className="mt-1"
            />
            <span>
              <strong>{t("price_fixed")}</strong>
              <span className="block text-[var(--muted)]">
                {t("price_fixed_hint")}
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="priceNegotiable"
              value="true"
              defaultChecked={Boolean(trip.priceNegotiable)}
              className="mt-1"
            />
            <span>
              <strong>{t("price_negotiable")}</strong>
              <span className="block text-[var(--muted)]">
                {t("price_negotiable_hint")}
              </span>
            </span>
          </label>
        </fieldset>
        <div className="space-y-2">
          <Label htmlFor="acceptedGoods">{t("accepted_goods")}</Label>
          <Textarea
            id="acceptedGoods"
            name="acceptedGoods"
            required
            defaultValue={trip.acceptedGoods}
          />
        </div>
        <TransportFields
          fromCountry={fromCountry}
          toCountry={toCountry}
          transportMode={transportMode}
          transportType={trip.transportType ?? ""}
          onModeChange={setTransportMode}
          airline={trip.airline ?? ""}
          flightNumber={trip.flightNumber ?? ""}
          fromAirportCode={trip.fromAirportCode ?? ""}
          toAirportCode={trip.toAirportCode ?? ""}
        />
        <div className="space-y-2">
          <Label htmlFor="notes">{t("notes")}</Label>
          <Textarea id="notes" name="notes" defaultValue={trip.notes ?? ""} />
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? t("loading") : t("save_changes")}
          </Button>
          <Link href={`/trips/${id}`}>
            <Button type="button" variant="outline">
              {t("cancel")}
            </Button>
          </Link>
        </div>
      </form>
    </Card>
  );
}
