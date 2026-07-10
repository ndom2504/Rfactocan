"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CorridorFields, DateField } from "@/components/corridor-fields";
import { FlightFields } from "@/components/flight-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { resolveCheckoutCurrency } from "@/lib/currency";
import { useI18n } from "@/components/locale-provider";

export default function NewTripPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fromCountry, setFromCountry] = useState("CA");
  const [toCountry, setToCountry] = useState("FR");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const departLocal = String(fd.get("departAt") || "").trim();
    const fromCountryValue = String(fd.get("fromCountry") || "").trim();
    const toCountryValue = String(fd.get("toCountry") || "").trim();
    const fromCity = String(fd.get("fromCity") || "").trim();
    const toCity = String(fd.get("toCity") || "").trim();
    const weightKg = Number(fd.get("weightKg"));
    const pricePerKgCad = Number(fd.get("pricePerKgCad"));
    const acceptedGoods = String(fd.get("acceptedGoods") || "").trim();
    const currency =
      String(fd.get("currency") || "").trim() ||
      resolveCheckoutCurrency(fromCountryValue, toCountryValue);

    if (!fromCountryValue || !toCountryValue) {
      setLoading(false);
      setError("Sélectionnez les pays de départ et d'arrivée.");
      return;
    }
    if (!fromCity || !toCity) {
      setLoading(false);
      setError("Indiquez les villes de départ et d'arrivée.");
      return;
    }
    if (!departLocal) {
      setLoading(false);
      setError("Indiquez la date de départ.");
      return;
    }
    const departAt = new Date(departLocal);
    if (Number.isNaN(departAt.getTime())) {
      setLoading(false);
      setError("Date de départ invalide.");
      return;
    }
    if (!Number.isFinite(weightKg) || weightKg <= 0) {
      setLoading(false);
      setError("Indiquez un poids disponible valide.");
      return;
    }
    if (!Number.isFinite(pricePerKgCad) || pricePerKgCad <= 0) {
      setLoading(false);
      setError("Indiquez un prix par kg valide.");
      return;
    }
    if (acceptedGoods.length < 2) {
      setLoading(false);
      setError("Décrivez les objets acceptés.");
      return;
    }

    const payload = {
      fromCountry: fromCountryValue,
      fromCity,
      toCountry: toCountryValue,
      toCity,
      departAt: departAt.toISOString(),
      weightKg,
      pricePerKgCad,
      currency,
      acceptedGoods,
      notes: String(fd.get("notes") || "").trim() || undefined,
      airline: String(fd.get("airline") || "").trim() || undefined,
      flightNumber: String(fd.get("flightNumber") || "").trim() || undefined,
      fromAirportCode:
        String(fd.get("fromAirportCode") || "").trim() || undefined,
      toAirportCode: String(fd.get("toAirportCode") || "").trim() || undefined,
    };

    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(data.error ?? "Erreur lors de la publication");
        return;
      }
      router.push(`/trips/${data.trip.id}`);
      router.refresh();
    } catch {
      setLoading(false);
      setError("Erreur réseau. Réessayez.");
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardTitle>{t("new_trip_title")}</CardTitle>
      <CardDescription>{t("new_trip_subtitle")}</CardDescription>
      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <CorridorFields
          onFromCountryChange={setFromCountry}
          onToCountryChange={setToCountry}
        />
        <DateField name="departAt" label={t("departure_date")} required />
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
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">{t("currency")}</Label>
            <Select id="currency" name="currency" defaultValue="CAD">
              <option value="CAD">CAD</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="acceptedGoods">{t("accepted_goods")}</Label>
          <Textarea
            id="acceptedGoods"
            name="acceptedGoods"
            placeholder={t("goods_placeholder")}
            required
          />
        </div>
        <FlightFields fromCountry={fromCountry} toCountry={toCountry} />
        <div className="space-y-2">
          <Label htmlFor="notes">{t("notes")}</Label>
          <Textarea id="notes" name="notes" />
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? t("loading") : t("publish")}
        </Button>
      </form>
    </Card>
  );
}
