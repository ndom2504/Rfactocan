import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate, formatKg } from "@/lib/utils";
import { getCountryName } from "@/lib/corridors";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const [trips, requests, bookings] = await Promise.all([
    prisma.trip.count({ where: { userId: user.id, status: "OPEN" } }),
    prisma.parcelRequest.count({
      where: { userId: user.id, status: "OPEN" },
    }),
    prisma.booking.findMany({
      where: {
        OR: [{ senderId: user.id }, { trip: { userId: user.id } }],
        status: { notIn: ["CANCELLED", "REFUSED"] },
      },
      include: {
        request: true,
        trip: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          Bonjour, {user.displayName}
        </h1>
        <p className="mt-1 text-[var(--muted)]">
          Gérez vos voyages, demandes et réservations Canada ↔ Afrique.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardDescription>Voyages ouverts</CardDescription>
          <CardTitle className="mt-2 text-3xl">{trips}</CardTitle>
        </Card>
        <Card>
          <CardDescription>Demandes ouvertes</CardDescription>
          <CardTitle className="mt-2 text-3xl">{requests}</CardTitle>
        </Card>
        <Card>
          <CardDescription>Note moyenne</CardDescription>
          <CardTitle className="mt-2 text-3xl">
            {user.ratingCount ? user.ratingAvg.toFixed(1) : "—"}
          </CardTitle>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/trips/new">
          <Button>Publier un voyage</Button>
        </Link>
        <Link href="/requests/new">
          <Button variant="secondary">Publier une demande</Button>
        </Link>
      </div>

      <section>
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Activité récente
        </h2>
        <div className="mt-4 space-y-3">
          {bookings.length === 0 && (
            <p className="text-sm text-[var(--muted)]">
              Aucune réservation pour le moment. Publiez un voyage ou une
              demande pour commencer.
            </p>
          )}
          {bookings.map((b) => (
            <Link key={b.id} href={`/bookings/${b.id}`}>
              <Card className="mb-3 transition hover:border-[var(--accent)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">
                      {b.request.fromCity} → {b.request.toCity} (
                      {getCountryName(b.request.toCountry)})
                    </CardTitle>
                    <CardDescription>
                      {formatKg(b.request.weightKg)} · départ voyage{" "}
                      {formatDate(b.trip.departAt)} · {b.status}
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    Ouvrir
                  </Button>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
