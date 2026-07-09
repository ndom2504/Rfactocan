"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CorridorFields, DateField } from "@/components/corridor-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export default function NewRequestPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);

  async function onUpload(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) setPhotos((p) => [...p, data.url]);
    else setError(data.error ?? "Upload échoué");
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const desired = String(fd.get("desiredDate") || "");
    const payload = {
      fromCountry: String(fd.get("fromCountry")),
      fromCity: String(fd.get("fromCity")),
      toCountry: String(fd.get("toCountry")),
      toCity: String(fd.get("toCity")),
      weightKg: Number(fd.get("weightKg")),
      description: String(fd.get("description")),
      urgency: String(fd.get("urgency")),
      declaredValue: fd.get("declaredValue")
        ? Number(fd.get("declaredValue"))
        : undefined,
      maxPricePerKg: fd.get("maxPricePerKg")
        ? Number(fd.get("maxPricePerKg"))
        : undefined,
      desiredDate: desired ? new Date(desired).toISOString() : undefined,
      photos,
    };

    const res = await fetch("/api/requests", {
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
    router.push(`/requests/${data.request.id}`);
    router.refresh();
  }

  return (
    <Card className="max-w-2xl">
      <CardTitle>Publier une demande de colis</CardTitle>
      <CardDescription>
        Décrivez le colis à envoyer. Le matching proposera des voyageurs.
      </CardDescription>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <CorridorFields />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="weightKg">Poids (kg)</Label>
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
            <Label htmlFor="urgency">Urgence</Label>
            <Select id="urgency" name="urgency" defaultValue="NORMAL">
              <option value="LOW">Faible</option>
              <option value="NORMAL">Normale</option>
              <option value="HIGH">Élevée</option>
              <option value="URGENT">Urgente</option>
            </Select>
          </div>
        </div>
        <DateField name="desiredDate" label="Date souhaitée (optionnel)" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="declaredValue">Valeur déclarée (CAD)</Label>
            <Input
              id="declaredValue"
              name="declaredValue"
              type="number"
              min="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxPricePerKg">Prix max / kg (CAD)</Label>
            <Input
              id="maxPricePerKg"
              name="maxPricePerKg"
              type="number"
              min="1"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="photos">Photos (max 5, 2 Mo)</Label>
          <Input
            id="photos"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && photos.length < 5) void onUpload(file);
            }}
          />
          {photos.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {photos.map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={url}
                  src={url}
                  alt=""
                  className="h-16 w-16 rounded object-cover"
                />
              ))}
            </div>
          )}
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? "Publication..." : "Publier"}
        </Button>
      </form>
    </Card>
  );
}
