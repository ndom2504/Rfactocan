"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CorridorFields, DateField } from "@/components/corridor-fields";
import { TransportFields } from "@/components/transport-fields";
import { CountryCodeSelect } from "@/components/country-select";
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
import type { OrderNeedTypeId } from "@/lib/order-need";
import {
  SERVICE_CATALOG,
  type ServiceCategoryId,
} from "@/lib/services-catalog";
import { SHOP_CATEGORIES } from "@/lib/shops-catalog";
import type { TransportMode } from "@/lib/transport";
import { getCities } from "@/lib/corridors";

const SERVICE_NEED_CATEGORIES = SERVICE_CATALOG.filter((c) => !c.isParcel);

export default function NewRequestPage() {
  const router = useRouter();
  const { t, locale, urgency } = useI18n();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [needType, setNeedType] = useState<OrderNeedTypeId>("PARCEL");
  const [orderIntent, setOrderIntent] = useState<OrderIntent>("envoyer");
  const [transportMode, setTransportMode] = useState<TransportMode>("AIR");
  const [serviceCategory, setServiceCategory] = useState<string>(
    SERVICE_NEED_CATEGORIES[0]?.id ?? "hebergement"
  );
  const [serviceType, setServiceType] = useState(
    SERVICE_NEED_CATEGORIES[0]?.types[0]?.id ?? ""
  );
  const [productCategory, setProductCategory] = useState<string>(
    SHOP_CATEGORIES[0]?.id ?? "electronics"
  );
  const [serviceCountry, setServiceCountry] = useState("CA");
  const [serviceCity, setServiceCity] = useState("");
  const [productCountry, setProductCountry] = useState("CA");
  const [productCity, setProductCity] = useState("");

  const serviceCities = useMemo(
    () => getCities(serviceCountry),
    [serviceCountry]
  );
  const productCities = useMemo(
    () => getCities(productCountry),
    [productCountry]
  );

  const serviceTypes = useMemo(() => {
    return (
      SERVICE_NEED_CATEGORIES.find((c) => c.id === serviceCategory)?.types ??
      []
    );
  }, [serviceCategory]);

  useEffect(() => {
    setOrderIntent(loadUserIntent().orderIntent);
  }, []);

  useEffect(() => {
    const first = serviceTypes[0]?.id ?? "";
    if (first && !serviceTypes.some((x) => x.id === serviceType)) {
      setServiceType(first);
    }
  }, [serviceTypes, serviceType]);

  useEffect(() => {
    if (serviceCities.length > 0 && !serviceCities.includes(serviceCity)) {
      setServiceCity(serviceCities[0] ?? "");
    }
  }, [serviceCities, serviceCity]);

  useEffect(() => {
    if (productCities.length > 0 && !productCities.includes(productCity)) {
      setProductCity(productCities[0] ?? "");
    }
  }, [productCities, productCity]);

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

    let payload: Record<string, unknown>;

    if (needType === "PARCEL") {
      payload = {
        needType: "PARCEL",
        orderSide: orderIntent === "recevoir" ? "receive" : "send",
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
        transportMode: String(fd.get("transportMode") || transportMode),
        transportType:
          String(fd.get("transportType") || "").trim() || undefined,
        photos,
      };
    } else if (needType === "SERVICE") {
      payload = {
        needType: "SERVICE",
        serviceCategory,
        serviceType,
        country: serviceCountry,
        city: serviceCity.trim() || String(fd.get("city") || ""),
        description: String(fd.get("description")),
        urgency: String(fd.get("urgency")),
        desiredDate: desired ? new Date(desired).toISOString() : undefined,
        photos,
      };
    } else {
      payload = {
        needType: "PRODUCT",
        productCategory,
        country: productCountry,
        city: productCity.trim() || String(fd.get("city") || ""),
        description: String(fd.get("description")),
        urgency: String(fd.get("urgency")),
        declaredValue: fd.get("declaredValue")
          ? Number(fd.get("declaredValue"))
          : undefined,
        desiredDate: desired ? new Date(desired).toISOString() : undefined,
        photos,
      };
    }

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

  const subtitle =
    needType === "SERVICE"
      ? t("order_need_service_hint")
      : needType === "PRODUCT"
        ? t("order_need_product_hint")
        : orderIntent === "recevoir"
          ? t("order_receive_hint")
          : t("new_request_subtitle");

  return (
    <Card className="max-w-2xl">
      <CardTitle>{t("new_request_title")}</CardTitle>
      <CardDescription>{subtitle}</CardDescription>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="needType">{t("order_need_type")}</Label>
          <Select
            id="needType"
            value={needType}
            onChange={(e) =>
              setNeedType(e.target.value as OrderNeedTypeId)
            }
          >
            <option value="PARCEL">{t("order_need_parcel")}</option>
            <option value="SERVICE">{t("order_need_service")}</option>
            <option value="PRODUCT">{t("order_need_product")}</option>
          </Select>
          <p className="text-xs text-[var(--muted)]">
            {needType === "PARCEL"
              ? t("order_need_parcel_hint")
              : needType === "SERVICE"
                ? t("order_need_service_hint")
                : t("order_need_product_hint")}
          </p>
        </div>

        {needType === "PARCEL" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="orderIntent">{t("order_intent")}</Label>
              <Select
                id="orderIntent"
                value={orderIntent}
                onChange={(e) =>
                  setOrderIntent(e.target.value as OrderIntent)
                }
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
            <TransportFields
              transportMode={transportMode}
              onModeChange={setTransportMode}
              showCarrierDetails={false}
            />
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
            <DateField name="desiredDate" label={t("desired_date")} type="date" />
            <div className="space-y-2">
              <Label htmlFor="declaredValue">{t("declared_value")}</Label>
              <Input
                id="declaredValue"
                name="declaredValue"
                type="number"
                min="0"
              />
            </div>
          </>
        )}

        {needType === "SERVICE" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="serviceCategory">{t("services_category")}</Label>
              <Select
                id="serviceCategory"
                value={serviceCategory}
                onChange={(e) => {
                  const id = e.target.value as ServiceCategoryId;
                  setServiceCategory(id);
                  const types =
                    SERVICE_NEED_CATEGORIES.find((c) => c.id === id)?.types ??
                    [];
                  setServiceType(types[0]?.id ?? "");
                }}
              >
                {SERVICE_NEED_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {locale === "en" ? c.labelEn : c.labelFr}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="serviceType">{t("services_type")}</Label>
              <Select
                id="serviceType"
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
              >
                {serviceTypes.map((ty) => (
                  <option key={ty.id} value={ty.id}>
                    {locale === "en" ? ty.labelEn : ty.labelFr}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <CountryCodeSelect
                name="country"
                label={t("country")}
                value={serviceCountry}
                onChange={(code) => {
                  setServiceCountry(code);
                  setServiceCity("");
                }}
              />
              <div className="space-y-2">
                <Label htmlFor="city">{t("city")}</Label>
                {serviceCities.length > 0 ? (
                  <Select
                    id="city"
                    name="city"
                    value={serviceCity}
                    onChange={(e) => setServiceCity(e.target.value)}
                    required
                  >
                    <option value="">{t("services_choose_city")}</option>
                    {serviceCities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    id="city"
                    name="city"
                    value={serviceCity}
                    onChange={(e) => setServiceCity(e.target.value)}
                    required
                  />
                )}
              </div>
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
            <DateField
              name="desiredDate"
              label={t("desired_service_date")}
              type="date"
            />
          </>
        )}

        {needType === "PRODUCT" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="productCategory">
                {t("order_product_category")}
              </Label>
              <Select
                id="productCategory"
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
              >
                {SHOP_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {locale === "en" ? c.labelEn : c.labelFr}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <CountryCodeSelect
                name="country"
                label={t("delivery_country")}
                value={productCountry}
                onChange={(code) => {
                  setProductCountry(code);
                  setProductCity("");
                }}
              />
              <div className="space-y-2">
                <Label htmlFor="city">{t("delivery_city")}</Label>
                {productCities.length > 0 ? (
                  <Select
                    id="city"
                    name="city"
                    value={productCity}
                    onChange={(e) => setProductCity(e.target.value)}
                    required
                  >
                    <option value="">{t("services_choose_city")}</option>
                    {productCities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    id="city"
                    name="city"
                    value={productCity}
                    onChange={(e) => setProductCity(e.target.value)}
                    required
                  />
                )}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="urgency">{t("urgency")}</Label>
                <Select id="urgency" name="urgency" defaultValue="NORMAL">
                  <option value="LOW">{urgency("LOW")}</option>
                  <option value="NORMAL">{urgency("NORMAL")}</option>
                  <option value="HIGH">{urgency("HIGH")}</option>
                  <option value="URGENT">{urgency("URGENT")}</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="declaredValue">{t("budget_hint")}</Label>
                <Input
                  id="declaredValue"
                  name="declaredValue"
                  type="number"
                  min="0"
                />
              </div>
            </div>
            <DateField
              name="desiredDate"
              label={t("desired_date")}
              type="date"
            />
          </>
        )}

        <div className="space-y-2">
          <Label htmlFor="description">
            {needType === "PRODUCT"
              ? t("order_product_description")
              : needType === "SERVICE"
                ? t("order_service_description")
                : t("description")}
          </Label>
          <Textarea id="description" name="description" required minLength={5} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="photos">
            {needType === "PARCEL"
              ? t("parcel_photos")
              : t("order_need_photos")}
          </Label>
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
