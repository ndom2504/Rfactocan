"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { uploadCommunityAttachment } from "@/lib/community-upload-client";

export function MarketplaceListingForm() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const gift = params.get("mode") === "gift";
  const [giftKind, setGiftKind] = useState<"produit" | "service">("produit");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [photo, setPhoto] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/profile");
      const data = await res.json().catch(() => null);
      const code = String(data?.user?.country ?? "").trim().toUpperCase();
      if (code.length === 2) setCountry(code);
    })();
  }, []);

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const uploaded = await uploadCommunityAttachment(file);
      setPhoto(uploaded.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    setBusy(true);
    setError("");
    const category = gift ? "don" : "produit";
    const serviceType = gift ? giftKind : "article";
    const amount = gift ? 0 : Number(price.replace(",", "."));
    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          serviceType,
          title: title.trim(),
          description: description.trim(),
          country: country.trim().toUpperCase(),
          city: city.trim(),
          priceAmount: amount,
          priceUnit: "forfait",
          photos: photo ? [photo] : [],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || t("retry"));
        return;
      }
      router.push("/community");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setBusy(false);
    }
  }

  const needsPhoto = !gift || giftKind === "produit";

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
        {gift ? t("home_cta_give") : t("publish_intent_product")}
      </h1>
      <p className="text-sm text-[var(--muted)]">{t("listing_hint")}</p>
      {gift ? (
        <div className="flex gap-2">
          <Button
            type="button"
            variant={giftKind === "produit" ? "default" : "outline"}
            onClick={() => setGiftKind("produit")}
          >
            {t("publish_intent_product")}
          </Button>
          <Button
            type="button"
            variant={giftKind === "service" ? "default" : "outline"}
            onClick={() => setGiftKind("service")}
          >
            {t("publish_intent_service")}
          </Button>
        </div>
      ) : null}
      <div className="space-y-1">
        <Label htmlFor="listing-title">{t("listing_title")}</Label>
        <Input id="listing-title" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="listing-desc">{t("description")}</Label>
        <Textarea
          id="listing-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
        />
      </div>
      {gift ? null : (
        <div className="space-y-1">
          <Label htmlFor="listing-price">{t("listing_price")}</Label>
          <Input
            id="listing-price"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="listing-city">{t("city")}</Label>
          <Input id="listing-city" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="listing-country">{t("country")}</Label>
          <Input
            id="listing-country"
            maxLength={2}
            value={country}
            onChange={(e) => setCountry(e.target.value.toUpperCase())}
            placeholder="GA"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="listing-photo">{t("listing_photo")}</Label>
        <Input
          id="listing-photo"
          type="file"
          accept="image/*"
          onChange={(e) => void onPhoto(e.target.files?.[0])}
        />
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="mt-2 h-32 w-32 rounded-lg object-cover" />
        ) : null}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button
        className="w-full"
        disabled={
          busy ||
          title.trim().length < 3 ||
          description.trim().length < 10 ||
          city.trim().length < 2 ||
          country.trim().length !== 2 ||
          (!gift && !(Number(price.replace(",", ".")) > 0)) ||
          (needsPhoto && !photo)
        }
        onClick={() => void publish()}
      >
        {busy ? t("loading") : t("listing_publish")}
      </Button>
    </div>
  );
}
