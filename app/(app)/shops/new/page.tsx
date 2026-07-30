"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CountryCodeSelect } from "@/components/country-select";
import { useI18n } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getCities } from "@/lib/corridors";
import {
  CURRENCY_OPTIONS,
  currencyForCountry,
  type MoneyCurrency,
} from "@/lib/currency";
import {
  SHOP_CATEGORIES,
  isShopCategoryId,
  type ShopCategoryId,
} from "@/lib/shops-catalog";

function NewShopForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useI18n();
  const initial = params.get("category") || "food_appliances";

  const [category, setCategory] = useState<ShopCategoryId>(
    isShopCategoryId(initial) ? initial : "food_appliances"
  );
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [country, setCountry] = useState("GA");
  const [city, setCity] = useState("");
  const [currency, setCurrency] = useState<MoneyCurrency>(() =>
    currencyForCountry("GA")
  );
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const cities = useMemo(() => getCities(country), [country]);

  useEffect(() => {
    setCurrency(currencyForCountry(country));
  }, [country]);

  async function onUpload(file: File) {
    setUploading(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    if (res.ok) setCoverUrl(data.url);
    else setError(data.error ?? "Upload échoué");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/shops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category,
        name,
        description,
        country,
        city,
        currency,
        coverUrl,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Erreur");
      return;
    }
    router.push(`/shops/${data.shop.id}/manage`);
  }

  return (
    <Card className="mx-auto max-w-xl">
      <CardTitle>{t("shops_create_title")}</CardTitle>
      <CardDescription className="mt-2">{t("shops_create_lead")}</CardDescription>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label>{t("shops_category")}</Label>
          <Select
            value={category}
            onChange={(e) => {
              if (isShopCategoryId(e.target.value)) {
                setCategory(e.target.value);
              }
            }}
            required
          >
            {SHOP_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.labelFr}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="shop-name">{t("shops_name")}</Label>
          <Input
            id="shop-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shop-desc">{t("shops_description")}</Label>
          <Textarea
            id="shop-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <CountryCodeSelect
              name="country"
              label="Pays"
              value={country}
              onChange={setCountry}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shop-city">Ville</Label>
            {cities.length > 0 ? (
              <Select
                id="shop-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              >
                <option value="">—</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                id="shop-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Devise</Label>
          <Select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as MoneyCurrency)}
          >
            {CURRENCY_OPTIONS.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t("shops_cover")}</Label>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onUpload(f);
            }}
          />
          {uploading && (
            <p className="text-xs text-[var(--muted)]">{t("loading")}</p>
          )}
          {coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt=""
              className="mt-2 h-32 w-full rounded-md object-cover"
            />
          )}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? t("loading") : t("shops_create_title")}
        </Button>
      </form>
    </Card>
  );
}

export default function NewShopPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">…</p>}>
      <NewShopForm />
    </Suspense>
  );
}
