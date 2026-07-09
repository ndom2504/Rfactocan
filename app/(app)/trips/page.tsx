import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRequestLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";
import { formatCad, formatDate, formatKg } from "@/lib/utils";
import { getCountryName } from "@/lib/corridors";

export default async function TripsPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const locale = await getRequestLocale();

  const trips = await prisma.trip.findMany({
    where: { status: "OPEN" },
    include: {
      user: {
        select: {
          displayName: true,
          avatarUrl: true,
          verifiedAt: true,
          ratingAvg: true,
          kycStatus: true,
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
            {t(locale, "trips_title")}
          </h1>
          <p className="text-[var(--muted)]">{t(locale, "trips_subtitle")}</p>
        </div>
        <Link href="/trips/new">
          <Button>{t(locale, "publish_trip")}</Button>
        </Link>
      </div>

      <div className="grid gap-4">
        {trips.map((trip) => (
          <Card key={trip.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 flex-1 gap-4">
                <UserAvatar
                  name={trip.user.displayName}
                  avatarUrl={trip.user.avatarUrl}
                  size="lg"
                />
                <div className="min-w-0">
                  <CardTitle>
                    {trip.fromCity} → {trip.toCity}
                  </CardTitle>
                  <CardDescription>
                    {getCountryName(trip.fromCountry)} →{" "}
                    {getCountryName(trip.toCountry)} ·{" "}
                    {formatDate(trip.departAt)}
                  </CardDescription>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge>
                      {formatKg(trip.weightKg)}{" "}
                      {t(locale, "weight_available_badge")}
                    </Badge>
                    <Badge>{formatCad(trip.pricePerKgCad)}/kg</Badge>
                    {(trip.user.verifiedAt ||
                      trip.user.kycStatus === "VERIFIED") && (
                      <Badge className="bg-[var(--accent-soft)] text-[var(--accent)]">
                        {t(locale, "traveler_verified")}
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
              </div>
              <Link href={`/trips/${trip.id}`}>
                <Button variant="outline">{t(locale, "details")}</Button>
              </Link>
            </div>
          </Card>
        ))}
        {trips.length === 0 && (
          <p className="text-sm text-[var(--muted)]">{t(locale, "no_trips")}</p>
        )}
      </div>
    </div>
  );
}
