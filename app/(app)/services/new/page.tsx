"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { CountryCodeSelect } from "@/components/country-select";
import { useI18n } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CURRENCY_OPTIONS, currencyForCountry } from "@/lib/currency";
import { getCities } from "@/lib/corridors";
import {
  PRICE_UNITS,
  SERVICE_CATALOG,
  encodeTransportServiceType,
  getCategory,
  isServiceCategoryId,
  parseTransportServiceType,
  productLabel,
  saleProductsForSector,
  transportServiceTypesForMode,
} from "@/lib/services-catalog";
import {
  TRANSPORT_MODES,
  type TransportMode,
  transportModeLabel,
} from "@/lib/transport";

function NewServiceForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { t, locale } = useI18n();
  const initialCat = params.get("category") || "hebergement";
  const initialType = params.get("type") || "";

  const [category, setCategory] = useState(
    isServiceCategoryId(initialCat) && initialCat !== "colis"
      ? initialCat
      : "hebergement"
  );
  const [serviceType, setServiceType] = useState(initialType);
  const [transportMode, setTransportMode] = useState<TransportMode>("ROAD");
  const [transportType, setTransportType] = useState("TAXI");
  const [country, setCountry] = useState("GA");
  const [city, setCity] = useState("");
  const [currency, setCurrency] = useState(() => currencyForCountry("GA"));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [products, setProducts] = useState<string[]>([]);
  const [customProduct, setCustomProduct] = useState("");

  const cat = getCategory(category);
  const saleProducts = useMemo(
    () => (category === "vente" ? saleProductsForSector(serviceType) : []),
    [category, serviceType]
  );
  const cities = useMemo(() => getCities(country), [country]);
  const publishable = SERVICE_CATALOG.filter((c) => !c.isParcel);
  const transportTypes = useMemo(
    () => transportServiceTypesForMode(transportMode),
    [transportMode]
  );

  useEffect(() => {
    setCurrency(currencyForCountry(country));
  }, [country]);

  useEffect(() => {
    if (category === "transport") return;
    const types = cat?.types ?? [];
    if (!types.some((x) => x.id === serviceType)) {
      setServiceType(types[0]?.id ?? "");
    }
  }, [category, cat, serviceType]);

  useEffect(() => {
    if (category !== "vente") {
      setProducts([]);
      setCustomProduct("");
      return;
    }
    setProducts([]);
    setCustomProduct("");
  }, [category, serviceType]);

  useEffect(() => {
    if (category !== "transport") return;
    const types = transportServiceTypesForMode(transportMode);
    if (!types.some((x) => x.id === transportType)) {
      setTransportType(types[0]?.id ?? "CAR");
    }
  }, [category, transportMode, transportType]);

  useEffect(() => {
    if (category !== "transport" || !initialType) return;
    const parsed = parseTransportServiceType(initialType);
    if (parsed) {
      setTransportMode(parsed.mode);
      setTransportType(parsed.typeCode);
    }
  }, [category, initialType]);

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
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const resolvedType =
      category === "transport"
        ? encodeTransportServiceType(transportMode, transportType)
        : serviceType;
    const payload = {
      category,
      serviceType: resolvedType,
      title: String(fd.get("title") || ""),
      description: String(fd.get("description") || ""),
      country,
      city: String(fd.get("city") || city),
      priceAmount: fd.get("priceAmount")
        ? Number(fd.get("priceAmount"))
        : undefined,
      priceUnit: String(fd.get("priceUnit") || "forfait"),
      currency,
      availableFrom: String(fd.get("availableFrom") || "") || undefined,
      availableTo: String(fd.get("availableTo") || "") || undefined,
      photos,
      ...(category === "vente" ? { products } : {}),
    };
    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? t("services_publish_error"));
      return;
    }
    router.push(`/services/listing/${data.listing.id}`);
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <CardTitle>{t("services_publish")}</CardTitle>
      <CardDescription className="mt-1">
        {t("services_publish_hint")}
      </CardDescription>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t("services_category")}</Label>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value as typeof category)}
            >
              {publishable.map((c) => (
                <option key={c.id} value={c.id}>
                  {locale === "en" ? c.labelEn : c.labelFr}
                </option>
              ))}
            </Select>
          </div>
          {category !== "transport" ? (
            <div className="space-y-1.5">
              <Label>
                {category === "vente"
                  ? t("services_sale_sector")
                  : t("services_type")}
              </Label>
              <Select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
              >
                {(cat?.types ?? []).map((tp) => (
                  <option key={tp.id} value={tp.id}>
                    {locale === "en" ? tp.labelEn : tp.labelFr}
                  </option>
                ))}
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>{t("transport_mode")}</Label>
              <Select
                value={transportMode}
                onChange={(e) =>
                  setTransportMode(e.target.value as TransportMode)
                }
              >
                {TRANSPORT_MODES.map((m) => (
                  <option key={m.code} value={m.code}>
                    {locale === "en" ? m.labelEn : m.labelFr}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>

        {category === "transport" && (
          <div className="space-y-1.5">
            <Label>{t("transport_type")}</Label>
            <Select
              value={transportType}
              onChange={(e) => setTransportType(e.target.value)}
            >
              {transportTypes.map((tp) => (
                <option key={tp.id} value={tp.id}>
                  {locale === "en" ? tp.labelEn : tp.labelFr}
                </option>
              ))}
            </Select>
            <p className="text-xs text-[var(--muted)]">
              {transportModeLabel(transportMode, locale === "en" ? "en" : "fr")}
            </p>
          </div>
        )}

        {category === "vente" && (
          <div className="space-y-2">
            <Label>{t("services_sale_products")}</Label>
            <p className="text-xs text-[var(--muted)]">
              {t("services_sale_products_hint")}
            </p>
            <div className="flex flex-wrap gap-2">
              {saleProducts.map((p) => {
                const selected = products.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      setProducts((prev) =>
                        selected
                          ? prev.filter((x) => x !== p.id)
                          : [...prev, p.id].slice(0, 20)
                      )
                    }
                    className={`rounded-md border px-3 py-1.5 text-sm ${
                      selected
                        ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                        : "border-[var(--border)] text-[var(--foreground)]"
                    }`}
                  >
                    {locale === "en" ? p.labelEn : p.labelFr}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              <Input
                value={customProduct}
                onChange={(e) => setCustomProduct(e.target.value)}
                placeholder={t("services_sale_product_custom")}
                className="max-w-xs"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const value = customProduct.trim();
                  if (!value) return;
                  setProducts((prev) =>
                    prev.includes(value) ? prev : [...prev, value].slice(0, 20)
                  );
                  setCustomProduct("");
                }}
              >
                {t("services_sale_product_add")}
              </Button>
            </div>
            {products.length > 0 && (
              <p className="text-xs text-[var(--muted)]">
                {products
                  .map((p) =>
                    productLabel(serviceType, p, locale === "en" ? "en" : "fr")
                  )
                  .join(" · ")}
              </p>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="title">{t("services_title_field")}</Label>
          <Input id="title" name="title" required minLength={3} maxLength={120} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">{t("description")}</Label>
          <Textarea
            id="description"
            name="description"
            required
            minLength={10}
            rows={5}
          />
        </div>

        <CountryCodeSelect
          name="country"
          label={t("country")}
          value={country}
          onChange={(code) => {
            setCountry(code);
            setCity("");
          }}
        />

        <div className="space-y-1.5">
          <Label htmlFor="city">{t("city")}</Label>
          {cities.length > 0 ? (
            <Select
              id="city"
              name="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            >
              <option value="">{t("services_choose_city")}</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              id="city"
              name="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="priceAmount">{t("services_price")}</Label>
            <Input
              id="priceAmount"
              name="priceAmount"
              type="number"
              min={0}
              step="0.01"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="priceUnit">{t("services_price_unit")}</Label>
            <Select id="priceUnit" name="priceUnit" defaultValue="forfait">
              {PRICE_UNITS.map((u) => (
                <option key={u.id} value={u.id}>
                  {locale === "en" ? u.labelEn : u.labelFr}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="currency">{t("currency")}</Label>
            <Select
              id="currency"
              name="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as typeof currency)}
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </Select>
            <p className="text-xs text-[var(--muted)]">
              {t("currency_from_country")}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="availableFrom">{t("services_available_from")}</Label>
            <Input id="availableFrom" name="availableFrom" type="date" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="availableTo">{t("services_available_to")}</Label>
            <Input id="availableTo" name="availableTo" type="date" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t("optional")} — photos</Label>
          <Input
            type="file"
            accept="image/*"
            disabled={uploading || photos.length >= 5}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onUpload(f);
            }}
          />
          {photos.length > 0 && (
            <ul className="text-xs text-[var(--muted)]">
              {photos.map((url) => (
                <li key={url}>
                  <button
                    type="button"
                    className="underline"
                    onClick={() => setPhotos((p) => p.filter((x) => x !== url))}
                  >
                    {t("remove_photo")}
                  </button>{" "}
                  {url.slice(0, 48)}…
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && <p className="text-sm text-red-700">{error}</p>}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={loading || uploading}>
            {loading ? t("loading") : t("publish")}
          </Button>
          <Link href="/services">
            <Button type="button" variant="outline">
              {t("cancel")}
            </Button>
          </Link>
        </div>
      </form>
    </Card>
  );
}

export default function NewServicePage() {
  return (
    <Suspense>
      <NewServiceForm />
    </Suspense>
  );
}
