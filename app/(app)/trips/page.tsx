import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRequestLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";
import { ListingOwnerActions } from "@/components/listing-owner-actions";
import { formatCad, formatDate, formatKg } from "@/lib/utils";
import { getCountryName } from "@/lib/corridors";

type Props = { searchParams: Promise<{ mine?: string }> };

export default async function TripsPage({ searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) return null;
  const locale = await getRequestLocale();
  const { mine } = await searchParams;
  const mineOnly = mine === "1";

  const trips = await prisma.trip.findMany({
    where: mineOnly
      ? { userId: user.id, status: { not: "CANCELLED" } }
      : { status: "OPEN" },
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
            {mineOnly ? t(locale, "my_trips") : t(locale, "trips_title")}
          </h1>
          <p className="text-[var(--muted)]">{t(locale, "trips_subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {mineOnly ? (
            <Link href="/trips">
              <Button variant="outline">{t(locale, "show_all_trips")}</Button>
            </Link>
          ) : (
            <Link href="/trips?mine=1">
              <Button variant="outline">{t(locale, "my_trips")}</Button>
            </Link>
          )}
          <Link href="/trips/new">
            <Button>{t(locale, "publish_trip")}</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4">
        {trips.map((trip) => {
          const isOwner = trip.userId === user.id;
          return (
            <Card key={trip.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>
                      {trip.fromCity} → {trip.toCity}
                    </CardTitle>
                    {isOwner && (
                      <Badge className="bg-[var(--accent-soft)] text-[var(--accent)]">
                        {t(locale, "my_listing")}
                      </Badge>
                    )}
                  </div>
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
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Link href={`/trips/${trip.id}`}>
                    <Button variant="outline">{t(locale, "details")}</Button>
                  </Link>
                  {isOwner && (
                    <ListingOwnerActions
                      kind="trip"
                      id={trip.id}
                      editHref={`/trips/${trip.id}/edit`}
                    />
                  )}
                </div>
              </div>

              <div className="mt-5 flex items-center gap-4 border-t border-[var(--border)] pt-4">
                <UserAvatar
                  name={trip.user.displayName}
                  avatarUrl={trip.user.avatarUrl}
                  size="xl"
                />
                <div className="min-w-0">
                  <p className="text-xs text-[var(--muted)]">
                    {t(locale, "profile_photo")}
                  </p>
                  <p className="font-medium">{trip.user.displayName}</p>
                  {trip.user.ratingAvg ? (
                    <p className="text-sm text-[var(--muted)]">
                      ★ {trip.user.ratingAvg.toFixed(1)}
                    </p>
                  ) : null}
                </div>
              </div>
            </Card>
          );
        })}
        {trips.length === 0 && (
          <p className="text-sm text-[var(--muted)]">{t(locale, "no_trips")}</p>
        )}
      </div>
    </div>
  );
}
