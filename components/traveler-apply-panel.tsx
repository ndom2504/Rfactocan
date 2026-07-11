"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { UserAvatar } from "@/components/user-avatar";
import { formatDate, formatKg, formatMoney } from "@/lib/utils";
import { useI18n } from "@/components/locale-provider";

type MyTrip = {
  id: string;
  fromCity: string;
  toCity: string;
  departAt: string;
  weightKg: number;
  pricePerKgCad: number;
  currency?: string;
};

type Props = {
  requestId: string;
  /** When set, skip trip picker and apply with this trip. */
  fixedTripId?: string;
};

export function TravelerApplyPanel({ requestId, fixedTripId }: Props) {
  const router = useRouter();
  const { t } = useI18n();
  const [trips, setTrips] = useState<MyTrip[]>([]);
  const [tripId, setTripId] = useState(fixedTripId ?? "");
  const [goodsCertified, setGoodsCertified] = useState(false);
  const [customsAcknowledged, setCustomsAcknowledged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [existingBookingId, setExistingBookingId] = useState<string | null>(
    null
  );

  useEffect(() => {
    void (async () => {
      const [tripsRes, bookingsRes] = await Promise.all([
        fixedTripId
          ? Promise.resolve(null)
          : fetch("/api/trips?mine=1"),
        fetch("/api/bookings?as=traveler"),
      ]);

      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json();
        const hit = (bookingsData.bookings ?? []).find(
          (b: { requestId?: string; request?: { id?: string }; id: string; status: string }) =>
            (b.requestId === requestId || b.request?.id === requestId) &&
            !["CANCELLED", "REFUSED"].includes(b.status)
        );
        if (hit) setExistingBookingId(hit.id);
      }

      if (fixedTripId) {
        setTripId(fixedTripId);
      } else if (tripsRes) {
        const data = await tripsRes.json();
        if (tripsRes.ok) {
          const list = (data.trips ?? []) as MyTrip[];
          setTrips(list);
          if (list.length === 1) setTripId(list[0].id);
        }
      }
      setLoaded(true);
    })();
  }, [fixedTripId, requestId]);

  useEffect(() => {
    if (!loaded) return;
    if (typeof window !== "undefined" && window.location.hash === "#apply") {
      document.getElementById("apply")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [loaded]);

  async function apply() {
    if (!tripId) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId,
        tripId,
        goodsCertified,
        customsAcknowledged,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Impossible de postuler");
      return;
    }
    router.push(`/bookings/${data.booking.id}`);
  }

  if (!loaded) {
    return (
      <p id="apply" className="text-sm text-[var(--muted)]">
        {t("loading")}
      </p>
    );
  }

  if (existingBookingId) {
    return (
      <Card id="apply">
        <CardTitle className="text-lg">{t("apply")}</CardTitle>
        <CardDescription className="mt-2">
          {t("application_pending_traveler")}
        </CardDescription>
        <div className="mt-4">
          <Link
            href={`/bookings/${existingBookingId}`}
            className={buttonVariants()}
          >
            {t("open_booking")}
          </Link>
        </div>
      </Card>
    );
  }

  if (!fixedTripId && trips.length === 0) {
    return (
      <Card id="apply" className="border-[var(--accent)]/30">
        <CardTitle className="text-lg">{t("apply")}</CardTitle>
        <CardDescription className="mt-2">{t("apply_no_trips")}</CardDescription>
        <div className="mt-4">
          <Link href="/trips/new" className={buttonVariants()}>
            {t("new_trip_title")}
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card id="apply" className="border-[var(--accent)]/30 bg-[var(--accent-soft)]/30">
      <CardTitle className="text-lg">{t("apply")}</CardTitle>
      <CardDescription className="mt-2">{t("apply_hint")}</CardDescription>
      {error && (
        <p className="mt-3 text-sm text-red-700">
          {error}{" "}
          {(error.includes("Profil") ||
            error.includes("identité") ||
            error.includes("gains") ||
            error.includes("KYC") ||
            error.includes("postuler")) && (
            <Link href="/profile" className="underline">
              {t("nav_profile")}
            </Link>
          )}
        </p>
      )}
      <div className="mt-4 space-y-3">
        {!fixedTripId && (
          <div className="space-y-1.5">
            <Label htmlFor="apply-trip">{t("select_trip")}</Label>
            <Select
              id="apply-trip"
              value={tripId}
              onChange={(e) => setTripId(e.target.value)}
            >
              <option value="">{t("select_trip")}</option>
              {trips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.fromCity} → {trip.toCity} · {formatDate(trip.departAt)} ·{" "}
                  {formatKg(trip.weightKg)} ·{" "}
                  {formatMoney(trip.pricePerKgCad, trip.currency || "CAD")}/kg
                </option>
              ))}
            </Select>
          </div>
        )}
        <label className="flex items-start gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 text-sm">
          <input
            type="checkbox"
            checked={goodsCertified}
            onChange={(e) => setGoodsCertified(e.target.checked)}
            className="mt-1"
          />
          {t("goods_cert")}
        </label>
        <label className="flex items-start gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 text-sm">
          <input
            type="checkbox"
            checked={customsAcknowledged}
            onChange={(e) => setCustomsAcknowledged(e.target.checked)}
            className="mt-1"
          />
          {t("customs_ack")}
        </label>
        {(!goodsCertified || !customsAcknowledged || !tripId) && (
          <p className="text-sm text-[var(--muted)]">
            {!tripId ? t("select_trip") : t("apply_check_required")}
          </p>
        )}
        <p className="text-xs text-[var(--muted)]">
          {t("kyc_connect_hint")}{" "}
          <Link href="/profile" className="underline">
            {t("nav_profile")}
          </Link>
        </p>
        <Button
          className="w-full sm:w-auto"
          disabled={
            loading || !tripId || !goodsCertified || !customsAcknowledged
          }
          onClick={() => void apply()}
        >
          {loading ? "..." : t("apply")}
        </Button>
      </div>
    </Card>
  );
}

type RequestMatch = {
  score: number;
  breakdown: {
    route: number;
    date: number;
    reputation: number;
    history: number;
  };
  request: {
    id: string;
    fromCity: string;
    toCity: string;
    weightKg: number;
    description: string;
    urgency: string;
    desiredDate: string | null;
    photos: string[];
    user: {
      id: string;
      displayName: string;
      avatarUrl?: string | null;
      ratingAvg: number;
      ratingCount: number;
      verifiedAt: string | null;
    };
  };
};

export function TripSuggestedRequests({ tripId }: { tripId: string }) {
  const { t, urgency } = useI18n();
  const [matches, setMatches] = useState<RequestMatch[]>([]);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/trips/${tripId}/matches`);
      const data = await res.json();
      if (res.ok) setMatches(data.matches ?? []);
      else setError(data.error ?? "");
      setLoaded(true);
    })();
  }, [tripId]);

  useEffect(() => {
    if (!loaded) return;
    if (typeof window !== "undefined" && window.location.hash === "#matches") {
      document.getElementById("matches")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [loaded]);

  if (!loaded) {
    return <p className="text-sm text-[var(--muted)]">{t("loading")}</p>;
  }

  return (
    <section className="space-y-4">
      <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
        {t("suggested_requests")}
      </h2>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {matches.length === 0 && (
        <p className="text-sm text-[var(--muted)]">{t("no_request_matches")}</p>
      )}
      {matches.map((m) => (
        <Card key={m.request.id}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>
                  {m.request.fromCity} → {m.request.toCity}
                </CardTitle>
                <Badge className="bg-[var(--accent)] text-white">
                  {m.score}%
                </Badge>
              </div>
              <CardDescription>
                {formatKg(m.request.weightKg)} · {urgency(m.request.urgency)}
                {m.request.desiredDate
                  ? ` · ${formatDate(m.request.desiredDate)}`
                  : ""}
              </CardDescription>
              <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">
                {m.request.description}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/requests/${m.request.id}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                {t("view_request")}
              </Link>
              <Button
                size="sm"
                onClick={() =>
                  setApplyingId(applyingId === m.request.id ? null : m.request.id)
                }
              >
                {t("apply")}
              </Button>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 border-t border-[var(--border)] pt-4">
            <UserAvatar
              name={m.request.user.displayName}
              avatarUrl={m.request.user.avatarUrl}
              size="xl"
            />
            <div className="min-w-0">
              <p className="text-xs text-[var(--muted)]">{t("profile_photo")}</p>
              <p className="font-medium">
                {m.request.user.displayName}
                {m.request.user.verifiedAt ? ` · ${t("verified")}` : ""}
                {m.request.user.ratingCount
                  ? ` · ★ ${m.request.user.ratingAvg.toFixed(1)}`
                  : ""}
              </p>
            </div>
          </div>
          {applyingId === m.request.id && (
            <div className="mt-4 border-t border-[var(--border)] pt-4">
              <TravelerApplyPanel
                requestId={m.request.id}
                fixedTripId={tripId}
              />
            </div>
          )}
        </Card>
      ))}
    </section>
  );
}
