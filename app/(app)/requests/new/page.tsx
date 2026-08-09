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
import { isJobNeedType } from "@/lib/jobs-catalog";
import {
  JOB_EXPERIENCE_LEVELS,
  JOB_SECTORS,
} from "@/lib/jobs-catalog";
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
  const [uploadingCv, setUploadingCv] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [jobCvUrl, setJobCvUrl] = useState<string | null>(null);
  const [needType, setNeedType] = useState<OrderNeedTypeId | "MEET">("PARCEL");
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
  const [jobSector, setJobSector] = useState<string>(
    JOB_SECTORS[0]?.id ?? "tech"
  );
  const [jobExperience, setJobExperience] = useState<string>(
    JOB_EXPERIENCE_LEVELS[0]?.id ?? "junior"
  );
  const [serviceCountry, setServiceCountry] = useState("CA");
  const [serviceCity, setServiceCity] = useState("");
  const [productCountry, setProductCountry] = useState("CA");
  const [productCity, setProductCity] = useState("");
  const [jobCountry, setJobCountry] = useState("CA");
  const [jobCity, setJobCity] = useState("");

  const serviceCities = useMemo(
    () => getCities(serviceCountry),
    [serviceCountry]
  );
  const productCities = useMemo(
    () => getCities(productCountry),
    [productCountry]
  );
  const jobCities = useMemo(() => getCities(jobCountry), [jobCountry]);

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

  useEffect(() => {
    if (jobCities.length > 0 && !jobCities.includes(jobCity)) {
      setJobCity(jobCities[0] ?? "");
    }
  }, [jobCities, jobCity]);

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

  async function onUploadCv(file: File) {
    setUploadingCv(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/jobs/upload-cv", {
      method: "POST",
      body: fd,
    });
    const data = await res.json();
    setUploadingCv(false);
    if (res.ok) setJobCvUrl(data.url);
    else setError(data.error ?? "Upload CV échoué");
  }

  function removePhoto(url: string) {
    setPhotos((p) => p.filter((x) => x !== url));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (needType === "MEET") {
      router.push("/meet");
      return;
    }
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
    } else if (needType === "PRODUCT") {
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
    } else {
      payload = {
        needType,
        jobTitle: String(fd.get("jobTitle") || "").trim(),
        jobSector,
        jobExperience,
        jobDiploma: String(fd.get("jobDiploma") || "").trim() || undefined,
        jobCvUrl: jobCvUrl || undefined,
        country: jobCountry,
        city: jobCity.trim() || String(fd.get("city") || ""),
        description: String(fd.get("description")),
        urgency: "NORMAL",
        desiredDate: desired ? new Date(desired).toISOString() : undefined,
        photos: photos.slice(0, 1),
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

  const isJob = needType !== "MEET" && isJobNeedType(needType);

  const subtitle =
    needType === "MEET"
      ? t("order_need_meet_hint")
      : isJob
      ? needType === "JOB_SEEK"
        ? t("order_need_job_seek_hint")
        : t("order_need_job_offer_hint")
      : needType === "SERVICE"
        ? t("order_need_service_hint")
        : needType === "PRODUCT"
          ? t("order_need_product_hint")
          : orderIntent === "recevoir"
            ? t("order_receive_hint")
            : t("new_request_subtitle");

  const needHint =
    needType === "PARCEL"
      ? t("order_need_parcel_hint")
      : needType === "SERVICE"
        ? t("order_need_service_hint")
        : needType === "PRODUCT"
          ? t("order_need_product_hint")
          : needType === "JOB_SEEK"
            ? t("order_need_job_seek_hint")
            : needType === "MEET"
              ? t("order_need_meet_hint")
              : t("order_need_job_offer_hint");

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
            onChange={(e) => {
              const next = e.target.value as OrderNeedTypeId | "MEET";
              setNeedType(next);
              if (next === "MEET" || !isJobNeedType(next)) setJobCvUrl(null);
            }}
          >
            <option value="PARCEL">{t("order_need_parcel")}</option>
            <option value="SERVICE">{t("order_need_service")}</option>
            <option value="PRODUCT">{t("order_need_product")}</option>
            <option value="JOB_SEEK">{t("order_need_job_seek")}</option>
            <option value="JOB_OFFER">{t("order_need_job_offer")}</option>
            <option value="MEET">{t("order_need_meet")}</option>
          </Select>
          <p className="text-xs text-[var(--muted)]">{needHint}</p>
        </div>

        {needType === "MEET" && (
          <div className="space-y-3 rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <p className="text-sm text-[var(--muted)]">{t("order_need_meet_hint")}</p>
            <Button type="button" onClick={() => router.push("/meet")}>
              {t("meet_create_cta")}
            </Button>
          </div>
        )}

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

        {isJob && (
          <>
            <div className="space-y-2">
              <Label htmlFor="jobTitle">
                {needType === "JOB_OFFER"
                  ? t("job_title_offer")
                  : t("job_title_seek")}
              </Label>
              <Input
                id="jobTitle"
                name="jobTitle"
                required
                minLength={2}
                maxLength={120}
                placeholder={
                  needType === "JOB_OFFER"
                    ? "Ex. Développeur full-stack"
                    : "Ex. Assistant commercial"
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="jobSector">{t("job_sector")}</Label>
                <Select
                  id="jobSector"
                  value={jobSector}
                  onChange={(e) => setJobSector(e.target.value)}
                >
                  {JOB_SECTORS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {locale === "en" ? s.labelEn : s.labelFr}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobExperience">{t("job_experience")}</Label>
                <Select
                  id="jobExperience"
                  value={jobExperience}
                  onChange={(e) => setJobExperience(e.target.value)}
                >
                  {JOB_EXPERIENCE_LEVELS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {locale === "en" ? s.labelEn : s.labelFr}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobDiploma">{t("job_diploma")}</Label>
              <Input
                id="jobDiploma"
                name="jobDiploma"
                maxLength={160}
                placeholder={t("job_diploma_placeholder")}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <CountryCodeSelect
                name="country"
                label={t("country")}
                value={jobCountry}
                onChange={(code) => {
                  setJobCountry(code);
                  setJobCity("");
                }}
              />
              <div className="space-y-2">
                <Label htmlFor="city">{t("city")}</Label>
                {jobCities.length > 0 ? (
                  <Select
                    id="city"
                    name="city"
                    value={jobCity}
                    onChange={(e) => setJobCity(e.target.value)}
                    required
                  >
                    <option value="">{t("services_choose_city")}</option>
                    {jobCities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    id="city"
                    name="city"
                    value={jobCity}
                    onChange={(e) => setJobCity(e.target.value)}
                    required
                  />
                )}
              </div>
            </div>
            <DateField
              name="desiredDate"
              label={
                needType === "JOB_SEEK"
                  ? t("job_available_from")
                  : t("desired_date")
              }
              type="date"
            />
            {needType === "JOB_SEEK" && (
              <div className="space-y-2">
                <Label htmlFor="jobCv">{t("job_cv")}</Label>
                <Input
                  id="jobCv"
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  disabled={uploadingCv}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void onUploadCv(file);
                    e.target.value = "";
                  }}
                />
                {uploadingCv && (
                  <p className="text-xs text-[var(--muted)]">{t("uploading")}</p>
                )}
                {jobCvUrl && (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <a
                      href={jobCvUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-[var(--accent)] underline"
                    >
                      {t("job_cv_uploaded")}
                    </a>
                    <button
                      type="button"
                      onClick={() => setJobCvUrl(null)}
                      className="text-xs text-[var(--muted)] underline"
                    >
                      {t("job_cv_remove")}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {needType !== "MEET" && (
        <>
        <div className="space-y-2">
          <Label htmlFor="description">
            {needType === "PRODUCT"
              ? t("order_product_description")
              : needType === "SERVICE"
                ? t("order_service_description")
                : needType === "JOB_SEEK"
                  ? t("job_description_seek")
                  : needType === "JOB_OFFER"
                    ? t("job_description_offer")
                    : t("description")}
          </Label>
          <Textarea id="description" name="description" required minLength={5} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="photos">
            {isJob
              ? t("job_photo")
              : needType === "PARCEL"
                ? t("parcel_photos")
                : t("order_need_photos")}
          </Label>
          <Input
            id="photos"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={
              uploading || photos.length >= (isJob ? 1 : 5)
            }
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && photos.length < (isJob ? 1 : 5)) void onUpload(file);
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
        <Button type="submit" disabled={loading || uploading || uploadingCv}>
          {loading ? t("loading") : t("publish")}
        </Button>
        </>
        )}
      </form>
    </Card>
  );
}
