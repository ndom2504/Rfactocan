"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CorridorFields, DateField } from "@/components/corridor-fields";
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

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
    weightKg: number;
    pricePerKgCad: number;
    currency: string;
    transportMode?: string;
    acceptedGoods: string;
    notes: string | null;
    airline: string | null;
    flightNumber: string | null;
    fromAirportCode: string | null;
    toAirportCode: string | null;
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
    const payload = {
      fromCountry,
      fromCity: String(fd.get("fromCity")),
      toCountry,
      toCity: String(fd.get("toCity")),
      departAt: new Date(String(fd.get("departAt"))).toISOString(),
      weightKg: Number(fd.get("weightKg")),
      pricePerKgCad: Number(fd.get("pricePerKgCad")),
      currency,
      transportMode: String(fd.get("transportMode") || transportMode),
      acceptedGoods: String(fd.get("acceptedGoods")),
      notes: String(fd.get("notes") || "") || null,
      airline: String(fd.get("airline") || "") || null,
      flightNumber: String(fd.get("flightNumber") || "") || null,
      fromAirportCode: String(fd.get("fromAirportCode") || "") || null,
      toAirportCode: String(fd.get("toAirportCode") || "") || null,
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
        <DateField
          name="departAt"
          label={t("departure_date")}
          required
          defaultValue={toLocalInput(trip.departAt)}
        />
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
