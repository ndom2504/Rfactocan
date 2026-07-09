"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CorridorFields, DateField } from "@/components/corridor-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export default function NewTripPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const departLocal = String(fd.get("departAt"));
    const payload = {
      fromCountry: String(fd.get("fromCountry")),
      fromCity: String(fd.get("fromCity")),
      toCountry: String(fd.get("toCountry")),
      toCity: String(fd.get("toCity")),
      departAt: new Date(departLocal).toISOString(),
      weightKg: Number(fd.get("weightKg")),
      pricePerKgCad: Number(fd.get("pricePerKgCad")),
      acceptedGoods: String(fd.get("acceptedGoods")),
      notes: String(fd.get("notes") || "") || undefined,
      airline: String(fd.get("airline") || "") || undefined,
      flightNumber: String(fd.get("flightNumber") || "") || undefined,
    };

    const res = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Erreur");
      return;
    }
    router.push(`/trips/${data.trip.id}`);
    router.refresh();
  }

  return (
    <Card className="max-w-2xl">
      <CardTitle>Publier un voyage</CardTitle>
      <CardDescription>
        Indiquez votre itinéraire et le poids disponible dans vos bagages.
      </CardDescription>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <CorridorFields />
        <DateField name="departAt" label="Date de départ" required />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="weightKg">Poids disponible (kg)</Label>
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
            <Label htmlFor="pricePerKgCad">Prix indicatif (CAD/kg)</Label>
            <Input
              id="pricePerKgCad"
              name="pricePerKgCad"
              type="number"
              step="0.5"
              min="1"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="acceptedGoods">Objets acceptés</Label>
          <Textarea
            id="acceptedGoods"
            name="acceptedGoods"
            placeholder="Vêtements, documents, produits non périssables..."
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="airline">Compagnie</Label>
            <Input id="airline" name="airline" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="flightNumber">N° de vol</Label>
            <Input id="flightNumber" name="flightNumber" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" />
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? "Publication..." : "Publier"}
        </Button>
      </form>
    </Card>
  );
}
