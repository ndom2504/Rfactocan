"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CorridorFields, DateField } from "@/components/corridor-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/locale-provider";
import {
  loadUserIntent,
  saveUserIntent,
  type OrderIntent,
} from "@/lib/user-intent";

export default function NewRequestPage() {
  const router = useRouter();
  const { t, urgency } = useI18n();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [orderIntent, setOrderIntent] = useState<OrderIntent>("envoyer");

  useEffect(() => {
    setOrderIntent(loadUserIntent().orderIntent);
  }, []);

  async function onUpload(file: File) {
    setUploading(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    if (res.ok) setPhotos((p) => [...p, data.url].slice(0, 5));
    else setError(data.error ?? "Upload échoué");
  }

  function removePhoto(url: string) {
    setPhotos((p) => p.filter((x) => x !== url));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    saveUserIntent({ orderIntent });
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
      <CardTitle>{t("new_request_title")}</CardTitle>
      <CardDescription>
        {orderIntent === "recevoir"
          ? t("order_receive_hint")
          : t("new_request_subtitle")}
      </CardDescription>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="orderIntent">{t("order_intent")}</Label>
          <Select
            id="orderIntent"
            value={orderIntent}
            onChange={(e) => setOrderIntent(e.target.value as OrderIntent)}
          >
            <option value="envoyer">{t("order_send")}</option>
            <option value="recevoir">{t("order_receive")}</option>
          </Select>
          <p className="text-xs text-[var(--muted)]">
            {orderIntent === "recevoir"
              ? t("order_receive_hint")
              : t("order_send_hint")}
          </p>
        </div>
        <CorridorFields />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="weightKg">{t("weight_kg")}</Label>
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
            <Label htmlFor="urgency">{t("urgency")}</Label>
            <Select id="urgency" name="urgency" defaultValue="NORMAL">
              <option value="LOW">{urgency("LOW")}</option>
              <option value="NORMAL">{urgency("NORMAL")}</option>
              <option value="HIGH">{urgency("HIGH")}</option>
              <option value="URGENT">{urgency("URGENT")}</option>
            </Select>
          </div>
        </div>
        <DateField name="desiredDate" label={t("desired_date")} />
        <div className="space-y-2">
          <Label htmlFor="declaredValue">{t("declared_value")}</Label>
          <Input
            id="declaredValue"
            name="declaredValue"
            type="number"
            min="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">{t("description")}</Label>
          <Textarea id="description" name="description" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="photos">{t("parcel_photos")}</Label>
          <Input
            id="photos"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={uploading || photos.length >= 5}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && photos.length < 5) void onUpload(file);
              e.target.value = "";
            }}
          />
          {uploading && (
            <p className="text-xs text-[var(--muted)]">{t("uploading")}</p>
          )}
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-3 pt-2 sm:grid-cols-5">
              {photos.map((url, index) => (
                <div
                  key={url}
                  className="group relative aspect-square overflow-hidden rounded-lg border border-[var(--border)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(url)}
                    className="absolute right-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white opacity-90 hover:bg-red-700"
                  >
                    {t("remove_photo")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <Button type="submit" disabled={loading || uploading}>
          {loading ? t("loading") : t("publish")}
        </Button>
      </form>
    </Card>
  );
}
