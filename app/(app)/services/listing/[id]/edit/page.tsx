"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
  formationTopicsForDomain,
  transportServiceTypesForMode,
} from "@/lib/services-catalog";
import {
  TRANSPORT_MODES,
  type TransportMode,
  transportModeLabel,
} from "@/lib/transport";

type ListingLoaded = {
  id: string;
  category: string;
  serviceType: string;
  title: string;
  description: string;
  country: string;
  city: string;
  priceAmount: number | null;
  priceUnit: string;
  currency: string;
  availableFrom: string | null;
  availableTo: string | null;
  photos: string[];
  products?: string[];
  websiteUrl?: string | null;
  userId: string;
};

function toDateInput(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function EditServicePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t, locale } = useI18n();

  const [loadingListing, setLoadingListing] = useState(true);
  const [category, setCategory] = useState("hebergement");
  const [serviceType, setServiceType] = useState("");
  const [transportMode, setTransportMode] = useState<TransportMode>("ROAD");
  const [transportType, setTransportType] = useState("TAXI");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [country, setCountry] = useState("GA");
  const [city, setCity] = useState("");
  const [currency, setCurrency] = useState(() => currencyForCountry("GA"));
  const [priceAmount, setPriceAmount] = useState("");
  const [priceUnit, setPriceUnit] = useState("forfait");
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableTo, setAvailableTo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [products, setProducts] = useState<string[]>([]);
  const [customProduct, setCustomProduct] = useState("");

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
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/services/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur");
        const listing = data.listing as ListingLoaded;
        if (cancelled) return;

        const catId = isServiceCategoryId(listing.category)
          ? listing.category
          : "hebergement";
        setCategory(catId);
        if (catId === "transport") {
          const parsed = parseTransportServiceType(listing.serviceType);
          if (parsed) {
            setTransportMode(parsed.mode);
            setTransportType(parsed.typeCode);
          }
        } else {
          setServiceType(listing.serviceType);
        }
        setTitle(listing.title);
        setDescription(listing.description);
        setCountry(listing.country);
        setCity(listing.city);
        setCurrency(
          (listing.currency as typeof currency) ||
            currencyForCountry(listing.country)
        );
        setPriceAmount(
          listing.priceAmount != null ? String(listing.priceAmount) : ""
        );
        setPriceUnit(listing.priceUnit || "forfait");
        setAvailableFrom(toDateInput(listing.availableFrom));
        setAvailableTo(toDateInput(listing.availableTo));
        setPhotos(listing.photos ?? []);
        setWebsiteUrl(listing.websiteUrl || "");
        setProducts(listing.products ?? []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erreur");
        }
      } finally {
        if (!cancelled) setLoadingListing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (category === "transport") return;
    const types = cat?.types ?? [];
    if (serviceType && !types.some((x) => x.id === serviceType)) {
      setServiceType(types[0]?.id ?? "");
    }
  }, [category, cat, serviceType]);

  useEffect(() => {
    if (category !== "transport") return;
    const types = transportServiceTypesForMode(transportMode);
    if (!types.some((x) => x.id === transportType)) {
      setTransportType(types[0]?.id ?? "CAR");
    }
  }, [category, transportMode, transportType]);

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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const resolvedType =
      category === "transport"
        ? encodeTransportServiceType(transportMode, transportType)
        : serviceType;
    const payload = {
      category,
      serviceType: resolvedType,
      title: title.trim(),
      description: description.trim(),
      country,
      city: city.trim(),
      priceAmount: priceAmount ? Number(priceAmount) : null,
      priceUnit,
      currency,
      availableFrom: availableFrom || null,
      availableTo: availableTo || null,
      photos,
      websiteUrl: websiteUrl.trim() || null,
      ...(category === "vente" || category === "formation"
        ? { products }
        : { products: [] }),
    };
    const res = await fetch(`/api/services/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? t("services_publish_error"));
      return;
    }
    router.push(`/services/listing/${id}`);
    router.refresh();
  }

  if (loadingListing) {
    return <p className="text-[var(--muted)]">{t("loading")}</p>;
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <CardTitle>{t("services_edit_title")}</CardTitle>
      <CardDescription className="mt-1">
        {t("services_edit_hint")}
      </CardDescription>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t("services_category")}</Label>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
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
          </div>
        )}

        {category === "formation" && (
          <div className="space-y-2">
            <Label>{t("services_formation_topics")}</Label>
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
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={3}
            maxLength={120}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">{t("description")}</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
            setCurrency(currencyForCountry(code));
          }}
        />

        <div className="space-y-1.5">
          <Label htmlFor="city">{t("city")}</Label>
          {cities.length > 0 ? (
            <Select
              id="city"
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
              type="number"
              min={0}
              step="0.01"
              value={priceAmount}
              onChange={(e) => setPriceAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="priceUnit">{t("services_price_unit")}</Label>
            <Select
              id="priceUnit"
              value={priceUnit}
              onChange={(e) => setPriceUnit(e.target.value)}
            >
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
              value={currency}
              onChange={(e) => setCurrency(e.target.value as typeof currency)}
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="availableFrom">{t("services_available_from")}</Label>
            <Input
              id="availableFrom"
              type="date"
              value={availableFrom}
              onChange={(e) => setAvailableFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="availableTo">{t("services_available_to")}</Label>
            <Input
              id="availableTo"
              type="date"
              value={availableTo}
              onChange={(e) => setAvailableTo(e.target.value)}
            />
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
        </div>

        <div className="space-y-2">
          <Label>{t("services_photos")}</Label>
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
            {loading ? t("loading") : t("save")}
          </Button>
          <Link href={`/services/listing/${id}`}>
            <Button type="button" variant="outline">
              {t("cancel")}
            </Button>
          </Link>
        </div>
      </form>
    </Card>
  );
}
