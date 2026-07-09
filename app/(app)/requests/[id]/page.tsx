"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";
import { ListingOwnerActions } from "@/components/listing-owner-actions";
import { formatCad, formatDate, formatKg } from "@/lib/utils";
import { useI18n } from "@/components/locale-provider";

type Match = {
  score: number;
  breakdown: {
    route: number;
    date: number;
    price: number;
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
    acceptedGoods: string;
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

type RequestData = {
  id: string;
  fromCity: string;
  toCity: string;
  toCountry: string;
  weightKg: number;
  description: string;
  urgency: string;
  desiredDate: string | null;
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
  const { t, urgency } = useI18n();
  const [id, setId] = useState<string>("");
  const [request, setRequest] = useState<RequestData | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [meId, setMeId] = useState<string>("");
  const [error, setError] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

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
      if (matchRes.ok) setMatches(matchData.matches ?? []);
      if (meRes.ok) setMeId(meData.user?.id ?? "");
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

  if (!request) {
    return <p className="text-sm text-[var(--muted)]">{t("loading")}</p>;
  }

  const isOwner = meId === request.userId;

  return (
    <div className="space-y-8">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-2xl">
                {request.fromCity} → {request.toCity}
              </CardTitle>
              {isOwner && (
                <Badge className="bg-[var(--accent-soft)] text-[var(--accent)]">
                  {t("my_listing")}
                </Badge>
              )}
            </div>
            <CardDescription>
              {formatKg(request.weightKg)} · {urgency(request.urgency)}
              {request.desiredDate
                ? ` · ${t("desired_date")} ${formatDate(request.desiredDate)}`
                : ""}
            </CardDescription>
            <p className="mt-4 text-sm leading-relaxed">{request.description}</p>
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
            <p className="mb-2 text-xs text-[var(--muted)]">{t("parcel_photo")}</p>
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
            {t("suggested_travelers")}
          </h2>
          {error && <p className="text-sm text-red-700">{error}</p>}
          {matches.length === 0 && (
            <p className="text-sm text-[var(--muted)]">{t("no_matches")}</p>
          )}
          {matches.map((m) => (
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
                    {formatDate(m.trip.departAt)} · {formatKg(m.trip.weightKg)} ·{" "}
                    {formatCad(m.trip.pricePerKgCad)}/kg
                  </CardDescription>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Route {m.breakdown.route}% · Date {m.breakdown.date}% · Prix{" "}
                    {m.breakdown.price}% · Réputation {m.breakdown.reputation}% ·
                    Historique {m.breakdown.history}%
                  </p>
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
                  <p className="text-xs text-[var(--muted)]">{t("profile_photo")}</p>
                  <p className="font-medium">
                    {m.trip.user.displayName}
                    {m.trip.user.verifiedAt ? ` · ${t("verified")}` : ""}
                    {m.trip.user.ratingCount
                      ? ` · ★ ${m.trip.user.ratingAvg.toFixed(1)}`
                      : ""}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
