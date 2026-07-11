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
import { TripSuggestedRequests } from "@/components/traveler-apply-panel";
import { SenderProposePanel } from "@/components/sender-propose-panel";
import { formatDate, formatKg, formatMoney } from "@/lib/utils";
import { getCountryName } from "@/lib/corridors";
import { transportModeLabel } from "@/lib/transport";

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
  const isTripOwner = me?.id === trip.userId;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
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
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge className="bg-[var(--accent-soft)] text-[var(--accent)]">
                {transportModeLabel(trip.transportMode, locale)}
              </Badge>
              <Badge>{formatDate(trip.departAt)}</Badge>
              <Badge>{formatKg(trip.weightKg)}</Badge>
              <Badge>
                {formatMoney(trip.pricePerKgCad, trip.currency || "CAD")}/kg
              </Badge>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {isTripOwner ? (
              <>
                <Link href="#matches">
                  <Button>{t(locale, "match")}</Button>
                </Link>
                <ListingOwnerActions
                  kind="trip"
                  id={trip.id}
                  editHref={`/trips/${trip.id}/edit`}
                />
              </>
            ) : (
              <Link href="#propose">
                <Button>{t(locale, "propose")}</Button>
              </Link>
            )}
          </div>
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
        </dl>

        <div className="mt-6 flex items-center gap-4 border-t border-[var(--border)] pt-5">
          <UserAvatar
            name={trip.user.displayName}
            avatarUrl={trip.user.avatarUrl}
            size="xl"
          />
          <div className="min-w-0">
            <p className="text-xs text-[var(--muted)]">
              {t(locale, "profile_photo")}
            </p>
            <p className="font-medium">
              {trip.user.displayName}
              {trip.user.verifiedAt || trip.user.kycStatus === "VERIFIED"
                ? ` · ${t(locale, "verified")}`
                : ""}
            </p>
            {trip.user.ratingCount ? (
              <p className="text-sm text-[var(--muted)]">
                ★ {trip.user.ratingAvg.toFixed(1)} ({trip.user.ratingCount})
              </p>
            ) : null}
            {trip.user.bio && (
              <p className="mt-1 text-sm text-[var(--muted)]">{trip.user.bio}</p>
            )}
          </div>
        </div>
      </Card>

      {isTripOwner && (
        <div id="matches">
          <TripSuggestedRequests tripId={trip.id} />
        </div>
      )}

      {me && !isTripOwner && trip.status === "OPEN" && (
        <SenderProposePanel tripId={trip.id} />
      )}
    </div>
  );
}
