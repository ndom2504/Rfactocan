"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";
import { ListingOwnerActions } from "@/components/listing-owner-actions";
import { TravelerApplyPanel } from "@/components/traveler-apply-panel";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatCad, formatDate, formatKg, formatMoney } from "@/lib/utils";
import { useI18n } from "@/components/locale-provider";
import {
  categoryLabel,
  serviceTypeLabel,
} from "@/lib/services-catalog";
import { shopCategoryLabel } from "@/lib/shops-catalog";
import {
  jobExperienceLabel,
  jobSectorLabel,
} from "@/lib/jobs-catalog";
import { normalizeOrderNeedType } from "@/lib/order-need";

type TripMatch = {
  kind?: "trip";
  score: number;
  breakdown: {
    route: number;
    date: number;
    reputation: number;
    history: number;
  };
  trip: {
    id: string;
    fromCity: string;
    toCity: string;
    fromCountry?: string;
    toCountry?: string;
    departAt: string;
    weightKg: number;
    pricePerKgCad: number;
    currency?: string;
    acceptedGoods: string;
    user: {
      id: string;
      displayName: string;
      avatarUrl?: string | null;
      ratingAvg: number;
      ratingCount: number;
      verifiedAt: string | null;
      kycStatus?: string;
    };
  };
};

type ServiceMatch = {
  kind: "service";
  score: number;
  listing: {
    id: string;
    title: string;
    category: string;
    serviceType: string;
    country: string;
    city: string;
    priceAmount: number | null;
    priceUnit: string;
    currency: string;
    description: string;
    photos: string[];
    user: {
      id: string;
      displayName: string;
      ratingAvg: number;
      ratingCount: number;
      avatarUrl?: string | null;
      kycStatus?: string;
    };
  };
};

type ProductMatch = {
  kind: "product";
  score: number;
  product: {
    id: string;
    title: string;
    description: string;
    priceCents: number;
    photoUrl: string | null;
    shop: {
      id: string;
      name: string;
      category: string;
      country: string;
      city: string;
      currency: string;
    };
  };
};

type JobMatch = {
  kind: "job";
  score: number;
  request: {
    id: string;
    needType: string;
    jobTitle: string | null;
    jobSector: string | null;
    jobExperience: string | null;
    jobDiploma: string | null;
    jobCvUrl: string | null;
    country: string;
    city: string;
    description: string;
    photos: string[];
    user: {
      id: string;
      displayName: string;
      ratingAvg: number;
      ratingCount: number;
      avatarUrl?: string | null;
      kycStatus?: string;
    };
  };
};

type AnyMatch = TripMatch | ServiceMatch | ProductMatch | JobMatch;

type RequestData = {
  id: string;
  needType?: string;
  orderSide?: string | null;
  serviceCategory?: string | null;
  serviceType?: string | null;
  productCategory?: string | null;
  jobTitle?: string | null;
  jobSector?: string | null;
  jobExperience?: string | null;
  jobDiploma?: string | null;
  jobCvUrl?: string | null;
  fromCity: string;
  fromCountry?: string;
  toCity: string;
  toCountry: string;
  weightKg: number;
  description: string;
  urgency: string;
  desiredDate: string | null;
  declaredValue: number | null;
  photos: string[];
  userId: string;
  user: { displayName: string; avatarUrl?: string | null };
};

export default function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { t, urgency, locale } = useI18n();
  const [id, setId] = useState<string>("");
  const [request, setRequest] = useState<RequestData | null>(null);
  const [matches, setMatches] = useState<AnyMatch[]>([]);
  const [matchKind, setMatchKind] = useState<
    "trip" | "service" | "product" | "job"
  >("trip");
  const [meId, setMeId] = useState<string>("");
  const [meLoaded, setMeLoaded] = useState(false);
  const [error, setError] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [contactedIds, setContactedIds] = useState<Set<string>>(new Set());
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [contactMessage, setContactMessage] = useState("");

  useEffect(() => {
    void params.then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      const [reqRes, matchRes, meRes] = await Promise.all([
        fetch(`/api/requests/${id}`),
        fetch(`/api/requests/${id}/matches`),
        fetch("/api/auth/me"),
      ]);
      const reqData = await reqRes.json();
      const matchData = await matchRes.json();
      const meData = await meRes.json();
      if (reqRes.ok) setRequest(reqData.request);
      if (matchRes.ok) {
        setMatches(matchData.matches ?? []);
        setMatchKind(matchData.matchKind ?? "trip");
      }
      if (meRes.ok) setMeId(meData.user?.id ?? "");
      setMeLoaded(true);
    })();
  }, [id]);

  async function propose(tripId: string) {
    setLoadingId(tripId);
    setError("");
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: id, tripId }),
    });
    const data = await res.json();
    setLoadingId(null);
    if (!res.ok) {
      setError(data.error ?? "Impossible de proposer");
      return;
    }
    router.push(`/bookings/${data.booking.id}`);
  }

  async function contactJob(toRequestId: string) {
    setLoadingId(toRequestId);
    setError("");
    const res = await fetch("/api/jobs/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromRequestId: id,
        toRequestId,
        message: contactMessage.trim() || undefined,
      }),
    });
    const data = await res.json();
    setLoadingId(null);
    if (!res.ok) {
      setError(data.error ?? "Impossible de contacter");
      return;
    }
    setContactedIds((prev) => new Set(prev).add(toRequestId));
    setActiveContactId(null);
    setContactMessage("");
    const threadId = data.threadId || data.thread?.id;
    if (threadId) {
      router.push(`/messages/dm/${threadId}`);
    }
  }

  if (!request) {
    return <p className="text-sm text-[var(--muted)]">{t("loading")}</p>;
  }

  const needType = normalizeOrderNeedType(request.needType ?? "PARCEL");
  const isOwner = Boolean(meId) && meId === request.userId;
  const showApply =
    meLoaded && Boolean(meId) && !isOwner && needType === "PARCEL";
  const isJob = needType === "JOB_SEEK" || needType === "JOB_OFFER";

  const title = isJob
    ? `${request.jobTitle || t("job_title")} · ${request.toCity}`
    : needType === "SERVICE"
      ? `${categoryLabel(request.serviceCategory || "", locale)} · ${request.toCity}`
      : needType === "PRODUCT"
        ? `${shopCategoryLabel(request.productCategory || "", locale)} · ${request.toCity}`
        : `${request.fromCity} → ${request.toCity}`;

  const needBadge =
    needType === "SERVICE"
      ? t("order_need_service")
      : needType === "PRODUCT"
        ? t("order_need_product")
        : needType === "JOB_SEEK"
          ? t("order_need_job_seek")
          : needType === "JOB_OFFER"
            ? t("order_need_job_offer")
            : t("order_need_parcel");

  const suggestedTitle =
    matchKind === "service"
      ? t("suggested_services")
      : matchKind === "product"
        ? t("suggested_products")
        : matchKind === "job"
          ? t("suggested_jobs")
          : t("suggested_travelers");

  return (
    <div className="space-y-8">
      {showApply && (
        <section className="space-y-3">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
            {t("apply_section_title")}
          </h2>
          <TravelerApplyPanel requestId={request.id} />
        </section>
      )}
      {!meLoaded && (
        <p className="text-sm text-[var(--muted)]">{t("loading")}</p>
      )}

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-2xl">{title}</CardTitle>
              <Badge className="bg-[var(--surface-2)] text-[var(--foreground)]">
                {needBadge}
              </Badge>
              {isOwner && (
                <Badge className="bg-[var(--accent-soft)] text-[var(--accent)]">
                  {t("my_listing")}
                </Badge>
              )}
            </div>
            <CardDescription>
              {needType === "PARCEL" && request.weightKg > 0
                ? `${formatKg(request.weightKg)} · `
                : ""}
              {!isJob ? urgency(request.urgency) : null}
              {isJob ? (
                <>
                  {jobSectorLabel(request.jobSector, locale)}
                  {request.jobExperience
                    ? ` · ${jobExperienceLabel(request.jobExperience, locale)}`
                    : ""}
                  {request.jobDiploma ? ` · ${request.jobDiploma}` : ""}
                  {` · ${request.toCity}, ${request.toCountry}`}
                </>
              ) : null}
              {needType === "SERVICE" && request.serviceType
                ? ` · ${serviceTypeLabel(request.serviceCategory || "", request.serviceType, locale)}`
                : ""}
              {request.desiredDate
                ? ` · ${t("desired_date")} ${formatDate(request.desiredDate)}`
                : ""}
              {request.declaredValue != null
                ? ` · ${t("declared_value")} ${formatCad(request.declaredValue)}`
                : ""}
            </CardDescription>
            <p className="mt-4 text-sm leading-relaxed">{request.description}</p>
            {isJob && request.jobCvUrl && (
              <p className="mt-3">
                <a
                  href={request.jobCvUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-[var(--accent)] underline"
                >
                  {t("job_cv_uploaded")}
                </a>
              </p>
            )}
          </div>
          {isOwner && (
            <ListingOwnerActions
              kind="request"
              id={request.id}
              editHref={`/requests/${request.id}/edit`}
            />
          )}
        </div>

        <div className="mt-6 grid gap-4 border-t border-[var(--border)] pt-5 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs text-[var(--muted)]">
              {isJob
                ? t("job_photo")
                : needType === "PARCEL"
                  ? t("parcel_photo")
                  : t("order_need_photos")}
            </p>
            {request.photos?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {request.photos.map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={url}
                    src={url}
                    alt=""
                    className="h-24 w-24 rounded-lg border border-[var(--border)] object-cover"
                  />
                ))}
              </div>
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--muted)]">
                {t("no_parcel_photo")}
              </div>
            )}
          </div>
          <div className="flex items-start gap-3">
            <div>
              <p className="mb-2 text-xs text-[var(--muted)]">
                {t("profile_photo")}
              </p>
              <div className="flex items-center gap-3">
                <UserAvatar
                  name={request.user.displayName}
                  avatarUrl={request.user.avatarUrl}
                  size="xl"
                />
                <p className="font-medium">{request.user.displayName}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {isOwner && (
        <section className="space-y-4">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
            {suggestedTitle}
          </h2>
          {matchKind === "job" && (
            <p className="text-sm text-[var(--muted)]">{t("job_contact_hint")}</p>
          )}
          {error && <p className="text-sm text-red-700">{error}</p>}
          {matches.length === 0 && (
            <p className="text-sm text-[var(--muted)]">{t("no_matches")}</p>
          )}

          {matchKind === "trip" &&
            matches.map((raw) => {
              const m = raw as TripMatch;
              if (!m.trip) return null;
              return (
                <Card key={m.trip.id}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle>
                          {m.trip.fromCity} → {m.trip.toCity}
                        </CardTitle>
                        <Badge className="bg-[var(--accent)] text-white">
                          {m.score}%
                        </Badge>
                      </div>
                      <CardDescription>
                        {formatDate(m.trip.departAt)} ·{" "}
                        {formatKg(m.trip.weightKg)} ·{" "}
                        {formatMoney(
                          m.trip.pricePerKgCad,
                          m.trip.currency || "CAD"
                        )}
                        /kg
                      </CardDescription>
                      {m.breakdown && (
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          Route {m.breakdown.route}% · Date {m.breakdown.date}% ·
                          Réputation {m.breakdown.reputation}% · Historique{" "}
                          {m.breakdown.history}%
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/trips/${m.trip.id}`}>
                        <Button variant="outline" size="sm">
                          {t("view_trip")}
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        disabled={loadingId === m.trip.id}
                        onClick={() => propose(m.trip.id)}
                      >
                        {loadingId === m.trip.id ? "..." : t("propose")}
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3 border-t border-[var(--border)] pt-4">
                    <UserAvatar
                      name={m.trip.user.displayName}
                      avatarUrl={m.trip.user.avatarUrl}
                      size="xl"
                    />
                    <div className="min-w-0">
                      <p className="font-medium">
                        {m.trip.user.displayName}
                        {m.trip.user.kycStatus === "VERIFIED"
                          ? ` · ${t("verified")}`
                          : ""}
                        {m.trip.user.ratingCount
                          ? ` · ★ ${m.trip.user.ratingAvg.toFixed(1)}`
                          : ""}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}

          {matchKind === "service" &&
            matches.map((raw) => {
              const m = raw as ServiceMatch;
              return (
                <Card key={m.listing.id}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle>{m.listing.title}</CardTitle>
                        <Badge className="bg-[var(--accent)] text-white">
                          {m.score}%
                        </Badge>
                      </div>
                      <CardDescription>
                        {m.listing.city}, {m.listing.country} ·{" "}
                        {serviceTypeLabel(
                          m.listing.category,
                          m.listing.serviceType,
                          locale
                        )}
                        {m.listing.priceAmount != null
                          ? ` · ${formatMoney(
                              m.listing.priceAmount,
                              m.listing.currency || "CAD"
                            )}`
                          : ""}
                      </CardDescription>
                      <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">
                        {m.listing.description}
                      </p>
                    </div>
                    <Link href={`/services/listing/${m.listing.id}`}>
                      <Button size="sm">{t("view_service")}</Button>
                    </Link>
                  </div>
                  <div className="mt-4 flex items-center gap-3 border-t border-[var(--border)] pt-4">
                    <UserAvatar
                      name={m.listing.user.displayName}
                      avatarUrl={m.listing.user.avatarUrl}
                      size="md"
                    />
                    <p className="font-medium">
                      {m.listing.user.displayName}
                      {m.listing.user.ratingCount
                        ? ` · ★ ${m.listing.user.ratingAvg.toFixed(1)}`
                        : ""}
                    </p>
                  </div>
                </Card>
              );
            })}

          {matchKind === "product" &&
            matches.map((raw) => {
              const m = raw as ProductMatch;
              return (
                <Card key={m.product.id}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-1 gap-3">
                      {m.product.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.product.photoUrl}
                          alt=""
                          className="h-16 w-16 rounded-lg object-cover"
                        />
                      ) : null}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle>{m.product.title}</CardTitle>
                          <Badge className="bg-[var(--accent)] text-white">
                            {m.score}%
                          </Badge>
                        </div>
                        <CardDescription>
                          {m.product.shop.name} · {m.product.shop.city} ·{" "}
                          {(m.product.priceCents / 100).toFixed(2)}{" "}
                          {m.product.shop.currency.toUpperCase()}
                        </CardDescription>
                      </div>
                    </div>
                    <Link href={`/shops/product/${m.product.id}`}>
                      <Button size="sm">{t("view_product")}</Button>
                    </Link>
                  </div>
                </Card>
              );
            })}

          {matchKind === "job" &&
            matches.map((raw) => {
              const m = raw as JobMatch;
              const already = contactedIds.has(m.request.id);
              const open = activeContactId === m.request.id;
              return (
                <Card key={m.request.id}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-1 gap-3">
                      {m.request.photos[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.request.photos[0]}
                          alt=""
                          className="h-14 w-14 rounded-full object-cover"
                        />
                      ) : (
                        <UserAvatar
                          name={m.request.user.displayName}
                          avatarUrl={m.request.user.avatarUrl}
                          size="lg"
                        />
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle>
                            {m.request.jobTitle || m.request.user.displayName}
                          </CardTitle>
                          <Badge className="bg-[var(--accent)] text-white">
                            {m.score}%
                          </Badge>
                          <Badge className="bg-[var(--surface-2)] text-[var(--foreground)]">
                            {m.request.needType === "JOB_OFFER"
                              ? t("order_need_job_offer")
                              : t("order_need_job_seek")}
                          </Badge>
                        </div>
                        <CardDescription>
                          {jobSectorLabel(m.request.jobSector, locale)}
                          {m.request.jobExperience
                            ? ` · ${jobExperienceLabel(m.request.jobExperience, locale)}`
                            : ""}
                          {` · ${m.request.city}, ${m.request.country}`}
                        </CardDescription>
                        {m.request.jobDiploma && (
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            {m.request.jobDiploma}
                          </p>
                        )}
                        <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">
                          {m.request.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Link href={`/requests/${m.request.id}`}>
                        <Button variant="outline" size="sm">
                          {t("view_job")}
                        </Button>
                      </Link>
                      {m.request.jobCvUrl && (
                        <a
                          href={m.request.jobCvUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Button variant="outline" size="sm" className="w-full">
                            CV
                          </Button>
                        </a>
                      )}
                      {already ? (
                        <Button size="sm" disabled>
                          {t("job_contact_sent")}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={loadingId === m.request.id}
                          onClick={() => {
                            setActiveContactId(
                              open ? null : m.request.id
                            );
                            setContactMessage("");
                          }}
                        >
                          {t("job_contact")}
                        </Button>
                      )}
                    </div>
                  </div>
                  {open && !already && (
                    <div className="mt-4 space-y-3 border-t border-[var(--border)] pt-4">
                      <div className="space-y-2">
                        <Label htmlFor={`msg-${m.request.id}`}>
                          {t("job_contact_message")}
                        </Label>
                        <Textarea
                          id={`msg-${m.request.id}`}
                          value={contactMessage}
                          onChange={(e) => setContactMessage(e.target.value)}
                          rows={3}
                          maxLength={800}
                          placeholder={t("job_contact_hint")}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={loadingId === m.request.id}
                          onClick={() => void contactJob(m.request.id)}
                        >
                          {loadingId === m.request.id
                            ? "..."
                            : t("job_contact")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setActiveContactId(null)}
                        >
                          {t("cancel")}
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="mt-4 flex items-center gap-3 border-t border-[var(--border)] pt-4">
                    <UserAvatar
                      name={m.request.user.displayName}
                      avatarUrl={m.request.user.avatarUrl}
                      size="md"
                    />
                    <p className="font-medium">
                      {m.request.user.displayName}
                      {m.request.user.kycStatus === "VERIFIED"
                        ? ` · ${t("verified")}`
                        : ""}
                      {m.request.user.ratingCount
                        ? ` · ★ ${m.request.user.ratingAvg.toFixed(1)}`
                        : ""}
                    </p>
                  </div>
                </Card>
              );
            })}
        </section>
      )}
    </div>
  );
}
