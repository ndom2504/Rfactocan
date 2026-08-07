"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import { MediaGallery } from "@/components/media-gallery";
import { FormattedDescription } from "@/components/formatted-description";
import { formatMoney, type MoneyCurrency } from "@/lib/currency";
import {
  productLabel,
  serviceTypeLabel,
} from "@/lib/services-catalog";
import { displayWebsiteHost } from "@/lib/service-website";

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
  products?: string[];
  websiteUrl?: string | null;
  userId: string;
  user: {
    id: string;
    displayName: string;
    ratingAvg: number;
    ratingCount: number;
    verifiedAt: string | null;
    kycStatus?: string;
    avatarUrl?: string | null;
  };
};

export default function ServiceListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t, locale } = useI18n();
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [meId, setMeId] = useState("");
  const [meKyc, setMeKyc] = useState("");

  useEffect(() => {
    fetch(`/api/services/${id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur");
        setListing(data.listing);
      })
      .catch((e: Error) => setError(e.message));
    fetch("/api/auth/me")
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        setMeId(data.user?.id ?? "");
        setMeKyc(data.user?.kycStatus ?? "");
      })
      .catch(() => {});
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

  async function contactProvider() {
    if (!listing) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/dm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toUserId: listing.userId || listing.user.id,
        contextType: "SERVICE",
        contextId: listing.id,
        body:
          locale === "en"
            ? `Hello, I am interested in your service « ${listing.title} ».`
            : `Bonjour, je suis intéressé(e) par votre service « ${listing.title} ».`,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Erreur");
      return;
    }
    const threadId = data.thread?.id;
    if (threadId) router.push(`/messages/dm/${threadId}`);
    else router.push("/messages");
  }

  if (error && !listing) {
    return <p className="text-red-700">{error}</p>;
  }
  if (!listing) {
    return <p className="text-[var(--muted)]">{t("loading")}</p>;
  }

  const isOwner = Boolean(meId) && meId === listing.userId;
  const meVerified = meKyc === "VERIFIED";
  const peerVerified = listing.user.kycStatus === "VERIFIED";
  const canContact =
    !isOwner && Boolean(meId) && meVerified && peerVerified;

  function goBack() {
    if (typeof window !== "undefined") {
      const ref = document.referrer;
      try {
        if (ref && new URL(ref).origin === window.location.origin) {
          router.back();
          return;
        }
      } catch {
        /* ignore bad referrer */
      }
      if (window.history.length > 1) {
        router.back();
        return;
      }
    }
    router.push(`/services/${listing.category}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 md:max-w-3xl">
      <button
        type="button"
        onClick={goBack}
        className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        ← {t("back")}
      </button>

      {/* Media band separate from title (clearer on desktop) */}
      {(listing.photos?.length ?? 0) > 0 && (
        <div className="overflow-hidden rounded-xl bg-[var(--surface-2)] md:rounded-2xl md:border md:border-[var(--border)] md:shadow-sm">
          <MediaGallery
            photos={listing.photos}
            alt={listing.title}
            maxHeightClass="max-h-[min(72vh,36rem)] md:max-h-[min(48vh,28rem)]"
          />
        </div>
      )}

      <Card className="md:rounded-2xl">
        <div className="flex items-start gap-3 md:gap-4">
          <div className="shrink-0 rounded-full ring-2 ring-[var(--accent)]/30 ring-offset-2 ring-offset-[var(--surface)]">
            <UserAvatar
              name={listing.user.displayName}
              avatarUrl={listing.user.avatarUrl}
              size="lg"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
              {serviceTypeLabel(listing.category, listing.serviceType, locale)}
            </p>
            <CardTitle className="mt-1 text-2xl md:text-[1.75rem]">
              {listing.title}
            </CardTitle>
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
          </div>
        </div>

        {(listing.products?.length ?? 0) > 0 && (
          <p className="mt-3 text-sm text-[var(--muted)]">
            {listing.category === "formation"
              ? t("services_formation_topics")
              : t("services_sale_products")}
            :{" "}
            {listing.products!
              .map((p) =>
                productLabel(
                  listing.serviceType,
                  p,
                  locale === "en" ? "en" : "fr"
                )
              )
              .join(" · ")}
          </p>
        )}

        {listing.websiteUrl ? (
          <p className="mt-3">
            <a
              href={listing.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-[var(--accent)] underline-offset-2 hover:underline"
            >
              {t("services_website_open")} ·{" "}
              {displayWebsiteHost(listing.websiteUrl)}
            </a>
          </p>
        ) : null}

        <FormattedDescription text={listing.description} className="mt-4" />

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

        <div className="mt-6 border-t border-[var(--border)] pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            {listing.user.displayName}
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {listing.user.ratingCount
              ? `★ ${listing.user.ratingAvg.toFixed(1)} (${listing.user.ratingCount})`
              : t("services_no_rating")}
            {listing.user.kycStatus === "VERIFIED"
              ? ` · ${t("verified")}`
              : ""}
          </p>
        </div>

        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          {isOwner && (
            <>
              <Link href={`/services/listing/${listing.id}/edit`}>
                <Button type="button" variant="outline">
                  {t("edit")}
                </Button>
              </Link>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={closeListing}
              >
                {t("services_close")}
              </Button>
            </>
          )}
          {!isOwner && (
            <Button
              type="button"
              disabled={busy || !canContact}
              onClick={() => void contactProvider()}
            >
              {t("services_contact")}
            </Button>
          )}
        </div>
        {!isOwner && meId && !canContact && (
          <p className="mt-2 text-xs text-[var(--muted)]">
            {t("dm_verified_required")}
          </p>
        )}
      </Card>
    </div>
  );
}
