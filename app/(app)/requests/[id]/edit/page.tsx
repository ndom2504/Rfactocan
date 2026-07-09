"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CorridorFields, DateField } from "@/components/corridor-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/locale-provider";

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { t, urgency } = useI18n();
  const [id, setId] = useState("");
  const [req, setReq] = useState<{
    fromCountry: string;
    fromCity: string;
    toCountry: string;
    toCity: string;
    weightKg: number;
    description: string;
    urgency: string;
    declaredValue: number | null;
    maxPricePerKg: number | null;
    desiredDate: string | null;
    photos: string[];
    userId: string;
    status: string;
  } | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    void params.then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      const [reqRes, meRes] = await Promise.all([
        fetch(`/api/requests/${id}`),
        fetch("/api/auth/me"),
      ]);
      const reqData = await reqRes.json();
      const meData = await meRes.json();
      if (!reqRes.ok) {
        setError(reqData.error ?? "Erreur");
        return;
      }
      const meId = meData.user?.id;
      if (
        meId &&
        reqData.request.userId !== meId &&
        meData.user?.role !== "ADMIN"
      ) {
        setForbidden(true);
        return;
      }
      setReq(reqData.request);
      setPhotos(reqData.request.photos ?? []);
    })();
  }, [id]);

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

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!req) return;
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
        : null,
      maxPricePerKg: fd.get("maxPricePerKg")
        ? Number(fd.get("maxPricePerKg"))
        : null,
      desiredDate: desired ? new Date(desired).toISOString() : null,
      photos,
    };

    const res = await fetch(`/api/requests/${id}`, {
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
    router.push(`/requests/${id}`);
    router.refresh();
  }

  if (forbidden) {
    return <p className="text-sm text-red-700">Interdit</p>;
  }
  if (!req) {
    return <p className="text-sm text-[var(--muted)]">{t("loading")}</p>;
  }

  return (
    <Card className="max-w-2xl">
      <CardTitle>{t("edit_request")}</CardTitle>
      <CardDescription>
        {req.fromCity} → {req.toCity}
      </CardDescription>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <CorridorFields
          defaults={{
            fromCountry: req.fromCountry,
            fromCity: req.fromCity,
            toCountry: req.toCountry,
            toCity: req.toCity,
          }}
        />
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
              defaultValue={req.weightKg}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="urgency">{t("urgency")}</Label>
            <Select id="urgency" name="urgency" defaultValue={req.urgency}>
              <option value="LOW">{urgency("LOW")}</option>
              <option value="NORMAL">{urgency("NORMAL")}</option>
              <option value="HIGH">{urgency("HIGH")}</option>
              <option value="URGENT">{urgency("URGENT")}</option>
            </Select>
          </div>
        </div>
        <DateField
          name="desiredDate"
          label={t("desired_date")}
          defaultValue={
            req.desiredDate ? toLocalInput(req.desiredDate) : undefined
          }
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="declaredValue">Valeur déclarée</Label>
            <Input
              id="declaredValue"
              name="declaredValue"
              type="number"
              min="0"
              defaultValue={req.declaredValue ?? undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxPricePerKg">Prix max / kg</Label>
            <Input
              id="maxPricePerKg"
              name="maxPricePerKg"
              type="number"
              min="1"
              defaultValue={req.maxPricePerKg ?? undefined}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">{t("description")}</Label>
          <Textarea
            id="description"
            name="description"
            required
            defaultValue={req.description}
          />
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
                    onClick={() =>
                      setPhotos((p) => p.filter((x) => x !== url))
                    }
                    className="absolute right-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white"
                  >
                    {t("remove_photo")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={loading || uploading}>
            {loading ? t("loading") : t("save_changes")}
          </Button>
          <Link href={`/requests/${id}`}>
            <Button type="button" variant="outline">
              {t("cancel")}
            </Button>
          </Link>
        </div>
      </form>
    </Card>
  );
}
