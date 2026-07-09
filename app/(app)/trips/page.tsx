import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCad, formatDate, formatKg } from "@/lib/utils";
import { getCountryName } from "@/lib/corridors";

export default async function TripsPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const trips = await prisma.trip.findMany({
    where: { status: "OPEN" },
    include: {
      user: {
        select: {
          displayName: true,
          verifiedAt: true,
          ratingAvg: true,
        },
      },
    },
    orderBy: { departAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
            Voyages
          </h1>
          <p className="text-[var(--muted)]">
            Voyageurs disponibles sur tous les corridors internationaux.
          </p>
        </div>
        <Link href="/trips/new">
          <Button>Publier un voyage</Button>
        </Link>
      </div>

      <div className="grid gap-4">
        {trips.map((trip) => (
          <Card key={trip.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle>
                  {trip.fromCity} → {trip.toCity}
                </CardTitle>
                <CardDescription>
                  {getCountryName(trip.fromCountry)} →{" "}
                  {getCountryName(trip.toCountry)} · {formatDate(trip.departAt)}
                </CardDescription>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge>{formatKg(trip.weightKg)} dispo</Badge>
                  <Badge>{formatCad(trip.pricePerKgCad)}/kg</Badge>
                  {trip.user.verifiedAt && (
                    <Badge className="bg-[var(--accent-soft)] text-[var(--accent)]">
                      Voyageur vérifié
                    </Badge>
                  )}
                </div>
                <p className="mt-3 text-sm text-[var(--muted)]">
                  {trip.user.displayName}
                  {trip.user.ratingAvg
                    ? ` · ★ ${trip.user.ratingAvg.toFixed(1)}`
                    : ""}
                </p>
              </div>
              <Link href={`/trips/${trip.id}`}>
                <Button variant="outline">Détails</Button>
              </Link>
            </div>
          </Card>
        ))}
        {trips.length === 0 && (
          <p className="text-sm text-[var(--muted)]">Aucun voyage publié.</p>
        )}
      </div>
    </div>
  );
}
