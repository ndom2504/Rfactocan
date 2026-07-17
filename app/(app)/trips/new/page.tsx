"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CorridorFields, DateField, combineDateAndTime } from "@/components/corridor-fields";
import { TransportFields } from "@/components/transport-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { CURRENCY_OPTIONS, resolveCheckoutCurrency } from "@/lib/currency";
import { maxWeightForMode, type TransportMode } from "@/lib/transport";
import { useI18n } from "@/components/locale-provider";
import {
  loadUserIntent,
  saveUserIntent,
  type CarrierType,
} from "@/lib/user-intent";
import { encodeNotesWithVehicle } from "@/lib/vehicle-notes";

export default function NewTripPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fromCountry, setFromCountry] = useState("CA");
  const [toCountry, setToCountry] = useState("FR");
  const [transportMode, setTransportMode] = useState<TransportMode>("AIR");
  const [carrierType, setCarrierType] = useState<CarrierType>("particulier");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleLicense, setVehicleLicense] = useState("");
  const [vehiclePhotoUrl, setVehiclePhotoUrl] = useState<string | null>(null);

  const needsVehicle =
    carrierType === "particulier" && transportMode === "ROAD";

  useEffect(() => {
    setCarrierType(loadUserIntent().carrierType);
  }, []);

  async function onUploadVehiclePhoto(file: File) {
    setUploading(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) {
      setError(data.error ?? "Upload échoué");
      return;
    }
    setVehiclePhotoUrl(data.url as string);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    saveUserIntent({ carrierType });
    const fd = new FormData(e.currentTarget);
    const departDate = String(fd.get("departDate") || "").trim();
    const departTime = String(fd.get("departTime") || "").trim();
    const arriveDate = String(fd.get("arriveDate") || "").trim();
    const arriveTime = String(fd.get("arriveTime") || "").trim();
    const fromCountryValue = String(fd.get("fromCountry") || "").trim();
    const toCountryValue = String(fd.get("toCountry") || "").trim();
    const fromCity = String(fd.get("fromCity") || "").trim();
    const toCity = String(fd.get("toCity") || "").trim();
    const weightKg = Number(fd.get("weightKg"));
    const pricePerKgCad = Number(fd.get("pricePerKgCad"));
    const acceptedGoods = String(fd.get("acceptedGoods") || "").trim();
    const mode = (String(fd.get("transportMode") || transportMode) ||
      "AIR") as TransportMode;
    const transportType =
      String(fd.get("transportType") || "").trim() || undefined;
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
    const departAt = combineDateAndTime(departDate, departTime);
    if (!departAt) {
      setLoading(false);
      setError("Indiquez la date et l'heure de départ.");
      return;
    }
    const arriveAt = combineDateAndTime(arriveDate, arriveTime);
    if (!arriveAt) {
      setLoading(false);
      setError("Indiquez la date et l'heure d'arrivée.");
      return;
    }
    if (arriveAt.getTime() < departAt.getTime()) {
      setLoading(false);
      setError("La date d'arrivée doit être après le départ.");
      return;
    }
    if (!Number.isFinite(weightKg) || weightKg <= 0) {
      setLoading(false);
      setError("Indiquez un poids disponible valide.");
      return;
    }
    const maxKg = maxWeightForMode(mode);
    if (weightKg > maxKg) {
      setLoading(false);
      setError(`Poids max ${maxKg} kg pour ce mode de transport.`);
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

    const needsVehicleNow =
      carrierType === "particulier" && mode === "ROAD";
    if (needsVehicleNow) {
      if (
        !vehiclePlate.trim() ||
        !vehicleLicense.trim() ||
        !vehiclePhotoUrl
      ) {
        setLoading(false);
        setError(t("vehicle_required"));
        return;
      }
    }

    const userNotes = String(fd.get("notes") || "").trim();
    const notes = encodeNotesWithVehicle(
      userNotes,
      needsVehicleNow
        ? {
            plate: vehiclePlate,
            licenseNumber: vehicleLicense,
            photoUrl: vehiclePhotoUrl!,
          }
        : null
    );

    const payload = {
      fromCountry: fromCountryValue,
      fromCity,
      toCountry: toCountryValue,
      toCity,
      departAt: departAt.toISOString(),
      arriveAt: arriveAt.toISOString(),
      weightKg,
      pricePerKgCad,
      currency,
      transportMode: mode,
      transportType,
      acceptedGoods,
      notes,
      airline: String(fd.get("airline") || "").trim() || undefined,
      flightNumber: String(fd.get("flightNumber") || "").trim() || undefined,
      fromAirportCode:
        String(fd.get("fromAirportCode") || "").trim() || undefined,
      toAirportCode: String(fd.get("toAirportCode") || "").trim() || undefined,
      priceNegotiable: fd.get("priceNegotiable") === "true",
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
        <div className="space-y-2">
          <Label htmlFor="carrierType">{t("carrier_type")}</Label>
          <Select
            id="carrierType"
            value={carrierType}
            onChange={(e) =>
              setCarrierType(e.target.value as CarrierType)
            }
          >
            <option value="particulier">{t("carrier_particulier")}</option>
            <option value="commercial">{t("carrier_commercial")}</option>
          </Select>
          <p className="text-xs text-[var(--muted)]">{t("carrier_hint")}</p>
        </div>

        <TransportFields
          fromCountry={fromCountry}
          toCountry={toCountry}
          transportMode={transportMode}
          onModeChange={setTransportMode}
          showCarrierDetails={false}
        />

        {needsVehicle && (
          <fieldset className="space-y-3 rounded-lg border border-[var(--border)] p-4">
            <legend className="px-1 text-sm font-medium">
              {t("vehicle_section")}
            </legend>
            <p className="text-xs text-[var(--muted)]">
              {t("vehicle_section_hint")}
            </p>
            <div className="space-y-2">
              <Label htmlFor="vehiclePlate">{t("vehicle_plate")}</Label>
              <Input
                id="vehiclePlate"
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                required={needsVehicle}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicleLicense">{t("vehicle_license")}</Label>
              <Input
                id="vehicleLicense"
                value={vehicleLicense}
                onChange={(e) => setVehicleLicense(e.target.value)}
                required={needsVehicle}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehiclePhoto">{t("vehicle_photo")}</Label>
              <Input
                id="vehiclePhoto"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onUploadVehiclePhoto(file);
                  e.target.value = "";
                }}
              />
              <p className="text-xs text-[var(--muted)]">
                {t("vehicle_photo_hint")}
              </p>
              {uploading && (
                <p className="text-xs text-[var(--muted)]">{t("uploading")}</p>
              )}
              {vehiclePhotoUrl && (
                <div className="mt-2 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={vehiclePhotoUrl}
                    alt={t("vehicle_photo")}
                    className="h-20 w-28 rounded-md border border-[var(--border)] object-cover"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setVehiclePhotoUrl(null)}
                  >
                    {t("remove_photo")}
                  </Button>
                </div>
              )}
            </div>
          </fieldset>
        )}

        <CorridorFields
          onFromCountryChange={setFromCountry}
          onToCountryChange={setToCountry}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <DateField
            name="departDate"
            label={t("departure_date")}
            type="date"
            required
          />
          <DateField
            name="departTime"
            label={t("departure_time")}
            type="time"
            required
          />
          <DateField
            name="arriveDate"
            label={t("arrival_date")}
            type="date"
            required
          />
          <DateField
            name="arriveTime"
            label={t("arrival_time")}
            type="time"
            required
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
              max={maxWeightForMode(transportMode)}
              required
            />
            <p className="text-xs text-[var(--muted)]">
              Max {maxWeightForMode(transportMode)} kg (
              {transportMode === "AIR"
                ? "aérien"
                : transportMode === "SEA"
                  ? "maritime"
                  : transportMode === "RAIL"
                    ? "rail"
                    : "route"}
              )
            </p>
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
            <p className="text-xs text-[var(--muted)]">{t("price_per_kg_hint")}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">{t("currency")}</Label>
            <Select id="currency" name="currency" defaultValue="CAD">
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
              defaultChecked
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
            placeholder={t("goods_placeholder")}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">{t("notes")}</Label>
          <Textarea id="notes" name="notes" />
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <Button type="submit" disabled={loading || uploading}>
          {loading ? t("loading") : t("publish")}
        </Button>
      </form>
    </Card>
  );
}
