"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { CountryCodeSelect } from "@/components/country-select";
import { useI18n } from "@/components/locale-provider";
import { PromoImagesDialog } from "@/components/promo-images-dialog";
import { Button } from "@/components/ui/button";
import { uploadServicePhoto } from "@/lib/service-upload-client";
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
  formationTopicsForDomain,
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
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [products, setProducts] = useState<string[]>([]);
  const [customProduct, setCustomProduct] = useState("");
  const [createdListingId, setCreatedListingId] = useState<string | null>(null);
  const [showPromoDialog, setShowPromoDialog] = useState(false);

  const cat = getCategory(category);
  const saleProducts = useMemo(
    () => (category === "vente" ? saleProductsForSector(serviceType) : []),
    [category, serviceType]
  );
  const formationTopics = useMemo(
    () =>
      category === "formation" ? formationTopicsForDomain(serviceType) : [],
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
    if (category !== "vente" && category !== "formation") {
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
    try {
      const url = await uploadServicePhoto(file);
      setPhotos((p) => [...p, url].slice(0, 5));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload échoué");
    } finally {
      setUploading(false);
    }
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
      websiteUrl: websiteUrl.trim() || undefined,
      ...(category === "vente" || category === "formation"
        ? { products }
        : {}),
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
    setCreatedListingId(data.listing.id);
    setShowPromoDialog(true);
  }

  function continueAfterPromo() {
    if (!createdListingId) return;
    setShowPromoDialog(false);
    router.push(`/services/listing/${createdListingId}`);
  }

  return (
    <>
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
                  : category === "formation"
                    ? t("services_formation_domain")
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

        {category === "formation" && (
          <div className="space-y-2">
            <Label>{t("services_formation_topics")}</Label>
            <p className="text-xs text-[var(--muted)]">
              {t("services_formation_topics_hint")}
            </p>
            <div className="flex flex-wrap gap-2">
              {formationTopics.map((p) => {
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
                placeholder={t("services_formation_topic_custom")}
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
                {t("services_formation_topic_add")}
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
              min={0.01}
              step="0.01"
              required
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

        <div className="space-y-1.5">
          <Label htmlFor="websiteUrl">{t("services_website")}</Label>
          <Input
            id="websiteUrl"
            type="url"
            inputMode="url"
            placeholder={t("services_website_hint")}
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            maxLength={300}
          />
          <p className="text-xs text-[var(--muted)]">{t("services_website_hint")}</p>
        </div>

        <div className="space-y-2">
          <Label>{t("services_photos")}</Label>
          <p className="text-xs text-[var(--muted)]">{t("services_photos_hint")}</p>
          <Input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={uploading || photos.length >= 5}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f && photos.length < 5) void onUpload(f);
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
                    onClick={() =>
                      setPhotos((p) => p.filter((x) => x !== url))
                    }
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
    <PromoImagesDialog
      open={showPromoDialog}
      title={
        photos.length === 0
          ? t("promo_images_service_title")
          : t("promo_images_service_ok_title")
      }
      body={
        photos.length === 0
          ? t("promo_images_service_body")
          : t("promo_images_service_ok_body")
      }
      onContinue={continueAfterPromo}
    />
    </>
  );
}

export default function NewServicePage() {
  return (
    <Suspense>
      <NewServiceForm />
    </Suspense>
  );
}
