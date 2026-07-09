"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";
import { formatCad, formatDate, formatKg } from "@/lib/utils";

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
    return <p className="text-sm text-[var(--muted)]">Chargement...</p>;
  }

  const isOwner = meId === request.userId;

  return (
    <div className="space-y-8">
      <Card>
        <div className="flex items-start gap-4">
          <UserAvatar
            name={request.user.displayName}
            avatarUrl={request.user.avatarUrl}
            size="lg"
          />
          <div>
            <CardTitle className="text-2xl">
              {request.fromCity} → {request.toCity}
            </CardTitle>
            <CardDescription>
              {formatKg(request.weightKg)} · {request.urgency}
              {request.desiredDate
                ? ` · souhaité ${formatDate(request.desiredDate)}`
                : ""}{" "}
              · {request.user.displayName}
            </CardDescription>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed">{request.description}</p>
        {request.photos?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {request.photos.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt=""
                className="h-20 w-20 rounded object-cover"
              />
            ))}
          </div>
        )}
      </Card>

      {isOwner && (
        <section className="space-y-4">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
            Voyageurs suggérés
          </h2>
          {error && <p className="text-sm text-red-700">{error}</p>}
          {matches.length === 0 && (
            <p className="text-sm text-[var(--muted)]">
              Aucun voyageur compatible pour le moment.
            </p>
          )}
          {matches.map((m) => (
            <Card key={m.trip.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 flex-1 gap-3">
                  <UserAvatar
                    name={m.trip.user.displayName}
                    avatarUrl={m.trip.user.avatarUrl}
                    size="md"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle>
                        {m.trip.fromCity} → {m.trip.toCity}
                      </CardTitle>
                      <Badge className="bg-[var(--accent)] text-white">
                        {m.score}%
                      </Badge>
                    </div>
                    <CardDescription>
                      {formatDate(m.trip.departAt)} · {formatKg(m.trip.weightKg)}{" "}
                      · {formatCad(m.trip.pricePerKgCad)}/kg
                    </CardDescription>
                    <p className="mt-2 text-sm">
                      {m.trip.user.displayName}
                      {m.trip.user.verifiedAt ? " · Vérifié" : ""}
                      {m.trip.user.ratingCount
                        ? ` · ★ ${m.trip.user.ratingAvg.toFixed(1)}`
                        : ""}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Route {m.breakdown.route}% · Date {m.breakdown.date}% · Prix{" "}
                      {m.breakdown.price}% · Réputation {m.breakdown.reputation}% ·
                      Historique {m.breakdown.history}%
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/trips/${m.trip.id}`}>
                    <Button variant="outline" size="sm">
                      Voir
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    disabled={loadingId === m.trip.id}
                    onClick={() => propose(m.trip.id)}
                  >
                    {loadingId === m.trip.id ? "..." : "Proposer"}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
