import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getRequestLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { ListingOwnerActions } from "@/components/listing-owner-actions";
import { formatCad, formatDate, formatKg } from "@/lib/utils";
import { getCountryName } from "@/lib/corridors";

type Props = { params: Promise<{ id: string }> };

export default async function TripDetailPage({ params }: Props) {
  const { id } = await params;
  const locale = await getRequestLocale();
  const me = await getSessionUser();
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          displayName: true,
          avatarUrl: true,
          bio: true,
          verifiedAt: true,
          ratingAvg: true,
          ratingCount: true,
          kycStatus: true,
        },
      },
    },
  });
  if (!trip) notFound();

  const isOwner = me?.id === trip.userId || me?.role === "ADMIN";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <div className="flex items-start gap-4">
          <UserAvatar
            name={trip.user.displayName}
            avatarUrl={trip.user.avatarUrl}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-2xl">
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
              {getCountryName(trip.toCountry)}
            </CardDescription>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge>{formatDate(trip.departAt)}</Badge>
          <Badge>{formatKg(trip.weightKg)}</Badge>
          <Badge>{formatCad(trip.pricePerKgCad)}/kg</Badge>
        </div>
        <dl className="mt-6 space-y-3 text-sm">
          <div>
            <dt className="text-[var(--muted)]">{t(locale, "accepted_goods")}</dt>
            <dd>{trip.acceptedGoods}</dd>
          </div>
          {trip.notes && (
            <div>
              <dt className="text-[var(--muted)]">{t(locale, "notes")}</dt>
              <dd>{trip.notes}</dd>
            </div>
          )}
          {(trip.airline ||
            trip.flightNumber ||
            trip.fromAirportCode ||
            trip.toAirportCode) && (
            <div>
              <dt className="text-[var(--muted)]">{t(locale, "flight")}</dt>
              <dd>
                {[
                  trip.airline,
                  trip.flightNumber,
                  trip.fromAirportCode && trip.toAirportCode
                    ? `${trip.fromAirportCode} → ${trip.toAirportCode}`
                    : trip.fromAirportCode || trip.toAirportCode,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-[var(--muted)]">{t(locale, "traveler")}</dt>
            <dd>
              {trip.user.displayName}
              {trip.user.verifiedAt || trip.user.kycStatus === "VERIFIED"
                ? ` · ${t(locale, "verified")}`
                : ""}
              {trip.user.ratingCount
                ? ` · ★ ${trip.user.ratingAvg.toFixed(1)} (${trip.user.ratingCount})`
                : ""}
            </dd>
            {trip.user.bio && (
              <p className="mt-1 text-[var(--muted)]">{trip.user.bio}</p>
            )}
          </div>
        </dl>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {isOwner ? (
            <ListingOwnerActions
              kind="trip"
              id={trip.id}
              editHref={`/trips/${trip.id}/edit`}
            />
          ) : (
            <Link href="/requests">
              <Button>{t(locale, "see_requests")}</Button>
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
}
