"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { formatMoney, type MoneyCurrency } from "@/lib/currency";
import {
  categoryLabel,
  serviceTypeLabel,
} from "@/lib/services-catalog";

type Listing = {
  id: string;
  title: string;
  description: string;
  category: string;
  serviceType: string;
  country: string;
  city: string;
  priceAmount: number | null;
  priceUnit: string;
  currency: string;
  availableFrom: string | null;
  availableTo: string | null;
  photos: string[];
  userId: string;
  user: {
    id: string;
    displayName: string;
    ratingAvg: number;
    ratingCount: number;
    verifiedAt: string | null;
  };
};

export default function ServiceListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t, locale } = useI18n();
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/services/${id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur");
        setListing(data.listing);
      })
      .catch((e: Error) => setError(e.message));
  }, [id]);

  async function closeListing() {
    if (!confirm(t("services_close_confirm"))) return;
    setBusy(true);
    const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.push(`/services/${listing?.category ?? ""}`);
    else {
      const data = await res.json();
      setError(data.error || "Erreur");
    }
  }

  if (error && !listing) {
    return <p className="text-red-700">{error}</p>;
  }
  if (!listing) {
    return <p className="text-[var(--muted)]">{t("loading")}</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/services/${listing.category}`}
        className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        ← {categoryLabel(listing.category, locale)}
      </Link>

      <Card>
        <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
          {serviceTypeLabel(listing.category, listing.serviceType, locale)}
        </p>
        <CardTitle className="mt-1 text-2xl">{listing.title}</CardTitle>
        <CardDescription className="mt-2">
          {listing.city}, {listing.country}
          {listing.priceAmount != null && (
            <>
              {" · "}
              {formatMoney(
                listing.priceAmount,
                (listing.currency as MoneyCurrency) || "CAD",
                locale === "en" ? "en-CA" : "fr-CA"
              )}{" "}
              / {listing.priceUnit}
            </>
          )}
        </CardDescription>

        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">
          {listing.description}
        </p>

        {(listing.availableFrom || listing.availableTo) && (
          <p className="mt-3 text-sm text-[var(--muted)]">
            {t("services_availability")}:{" "}
            {listing.availableFrom
              ? new Date(listing.availableFrom).toLocaleDateString(
                  locale === "en" ? "en-CA" : "fr-CA"
                )
              : "…"}{" "}
            →{" "}
            {listing.availableTo
              ? new Date(listing.availableTo).toLocaleDateString(
                  locale === "en" ? "en-CA" : "fr-CA"
                )
              : "…"}
          </p>
        )}

        {listing.photos?.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {listing.photos.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt=""
                className="h-36 w-full rounded-md object-cover"
              />
            ))}
          </div>
        )}

        <div className="mt-6 border-t border-[var(--border)] pt-4">
          <p className="font-medium">{listing.user.displayName}</p>
          <p className="text-sm text-[var(--muted)]">
            {listing.user.ratingCount
              ? `★ ${listing.user.ratingAvg.toFixed(1)} (${listing.user.ratingCount})`
              : t("services_no_rating")}
            {listing.user.verifiedAt ? ` · ${t("verified")}` : ""}
          </p>
        </div>

        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/messages">
            <Button>{t("services_contact")}</Button>
          </Link>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={closeListing}
          >
            {t("services_close")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
