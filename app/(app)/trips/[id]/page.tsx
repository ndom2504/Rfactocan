import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCad, formatDate, formatKg } from "@/lib/utils";
import { getCountryName } from "@/lib/corridors";

type Props = { params: Promise<{ id: string }> };

export default async function TripDetailPage({ params }: Props) {
  const { id } = await params;
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          displayName: true,
          bio: true,
          verifiedAt: true,
          ratingAvg: true,
          ratingCount: true,
        },
      },
    },
  });
  if (!trip) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardTitle className="text-2xl">
          {trip.fromCity} → {trip.toCity}
        </CardTitle>
        <CardDescription>
          {getCountryName(trip.fromCountry)} → {getCountryName(trip.toCountry)}
        </CardDescription>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge>{formatDate(trip.departAt)}</Badge>
          <Badge>{formatKg(trip.weightKg)}</Badge>
          <Badge>{formatCad(trip.pricePerKgCad)}/kg</Badge>
        </div>
        <dl className="mt-6 space-y-3 text-sm">
          <div>
            <dt className="text-[var(--muted)]">Objets acceptés</dt>
            <dd>{trip.acceptedGoods}</dd>
          </div>
          {trip.notes && (
            <div>
              <dt className="text-[var(--muted)]">Notes</dt>
              <dd>{trip.notes}</dd>
            </div>
          )}
          {(trip.airline || trip.flightNumber) && (
            <div>
              <dt className="text-[var(--muted)]">Vol</dt>
              <dd>
                {[trip.airline, trip.flightNumber].filter(Boolean).join(" · ")}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-[var(--muted)]">Voyageur</dt>
            <dd>
              {trip.user.displayName}
              {trip.user.verifiedAt ? " · Vérifié" : ""}
              {trip.user.ratingCount
                ? ` · ★ ${trip.user.ratingAvg.toFixed(1)} (${trip.user.ratingCount})`
                : ""}
            </dd>
            {trip.user.bio && (
              <p className="mt-1 text-[var(--muted)]">{trip.user.bio}</p>
            )}
          </div>
        </dl>
        <div className="mt-6">
          <Link href="/requests">
            <Button>Voir les demandes / matcher</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
