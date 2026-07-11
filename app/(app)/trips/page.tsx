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
import { formatDate, formatKg, formatMoney } from "@/lib/utils";
import { getCountryName } from "@/lib/corridors";
import { TRANSPORT_MODES, transportModeLabel } from "@/lib/transport";
import { negotiationLabel } from "@/lib/negotiation";

type Props = {
  searchParams: Promise<{ mine?: string; transportMode?: string }>;
};

export default async function TripsPage({ searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) return null;
  const locale = await getRequestLocale();
  const { mine, transportMode: modeFilter } = await searchParams;
  const mineOnly = mine === "1";
  const mode =
    modeFilter && ["AIR", "SEA", "RAIL", "ROAD"].includes(modeFilter)
      ? modeFilter
      : undefined;

  const trips = await prisma.trip.findMany({
    where: {
      ...(mineOnly
        ? { userId: user.id, status: { not: "CANCELLED" as const } }
        : { status: "OPEN" as const }),
      ...(mode ? { transportMode: mode as "AIR" | "SEA" | "RAIL" | "ROAD" } : {}),
    },
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
      _count: {
        select: {
          bookings: {
            where: {
              status: { in: ["PROPOSED", "AWAITING_PAYMENT"] },
            },
          },
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

      <div className="flex flex-wrap gap-2">
        <Link href={mineOnly ? "/trips?mine=1" : "/trips"}>
          <Badge
            className={
              !mode
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--surface-2)] text-[var(--foreground)]"
            }
          >
            {locale === "en" ? "All modes" : "Tous les modes"}
          </Badge>
        </Link>
        {TRANSPORT_MODES.map((m) => {
          const href = mineOnly
            ? `/trips?mine=1&transportMode=${m.code}`
            : `/trips?transportMode=${m.code}`;
          const active = mode === m.code;
          return (
            <Link key={m.code} href={href}>
              <Badge
                className={
                  active
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--surface-2)] text-[var(--foreground)]"
                }
              >
                {locale === "en" ? m.labelEn : m.labelFr}
              </Badge>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4">
        {trips.map((trip) => {
          const isOwner = trip.userId === user.id;
          const discussionCount = trip._count.bookings;
          const nego = negotiationLabel({
            priceNegotiable: trip.priceNegotiable,
            discussionCount,
            locale,
          });
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
                    <Badge className="bg-[var(--accent-soft)] text-[var(--accent)]">
                      {transportModeLabel(trip.transportMode, locale)}
                    </Badge>
                    <Badge>
                      {formatKg(trip.weightKg)}{" "}
                      {t(locale, "weight_available_badge")}
                    </Badge>
                    <Badge>
                      {formatMoney(trip.pricePerKgCad, trip.currency || "CAD")}
                      /kg
                    </Badge>
                    <Badge
                      className={
                        trip.priceNegotiable && discussionCount > 0
                          ? "bg-[var(--accent)] text-white"
                          : trip.priceNegotiable
                            ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                            : undefined
                      }
                    >
                      {nego}
                    </Badge>
                    {(trip.user.verifiedAt ||
                      trip.user.kycStatus === "VERIFIED") && (
                      <Badge className="bg-[var(--accent-soft)] text-[var(--accent)]">
                        {t(locale, "traveler_verified")}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {isOwner ? (
                    <>
                      <Link href={`/trips/${trip.id}#matches`}>
                        <Button>{t(locale, "match")}</Button>
                      </Link>
                      <Link href={`/trips/${trip.id}`}>
                        <Button variant="outline">{t(locale, "details")}</Button>
                      </Link>
                      <ListingOwnerActions
                        kind="trip"
                        id={trip.id}
                        editHref={`/trips/${trip.id}/edit`}
                      />
                    </>
                  ) : (
                    <>
                      <Link href={`/trips/${trip.id}#propose`}>
                        <Button>{t(locale, "propose")}</Button>
                      </Link>
                      <Link href={`/trips/${trip.id}`}>
                        <Button variant="outline">{t(locale, "details")}</Button>
                      </Link>
                    </>
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
