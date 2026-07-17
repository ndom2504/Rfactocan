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
import { TripActiveNegotiations } from "@/components/trip-active-negotiations";
import { formatDate, formatKg, formatMoney } from "@/lib/utils";
import { getCountryName } from "@/lib/corridors";
import { transportModeLabel, transportTypeLabel } from "@/lib/transport";
import { parseCarrierFromNotes } from "@/lib/vehicle-notes";
import { negotiationLabel } from "@/lib/negotiation";

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
          phone: true,
          country: true,
          verifiedAt: true,
          ratingAvg: true,
          ratingCount: true,
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
  });
  if (!trip) notFound();

  const isOwner = me?.id === trip.userId || me?.role === "ADMIN";
  const isTripOwner = me?.id === trip.userId;
  const discussionCount = trip._count.bookings;
  const nego = negotiationLabel({
    priceNegotiable: trip.priceNegotiable,
    discussionCount,
    locale,
  });
  const { vehicle, commercial, userNotes } = parseCarrierFromNotes(trip.notes);

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
              {trip.transportType && (
                <Badge>
                  {transportTypeLabel(
                    trip.transportMode,
                    trip.transportType,
                    locale
                  )}
                </Badge>
              )}
              <Badge>
                {t(locale, "departure_date")}: {formatDate(trip.departAt)}
              </Badge>
              {trip.arriveAt && (
                <Badge>
                  {t(locale, "arrival_date")}: {formatDate(trip.arriveAt)}
                </Badge>
              )}
              <Badge>{formatKg(trip.weightKg)}</Badge>
              <Badge>
                {formatMoney(trip.pricePerKgCad, trip.currency || "CAD")}/kg
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
          {vehicle && (
            <div>
              <dt className="text-[var(--muted)]">{t(locale, "vehicle_section")}</dt>
              <dd className="mt-1 space-y-2">
                <p>
                  {t(locale, "vehicle_plate")}: <strong>{vehicle.plate}</strong>
                </p>
                <p>
                  {t(locale, "vehicle_license")}:{" "}
                  <strong>{vehicle.licenseNumber}</strong>
                </p>
                {vehicle.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={vehicle.photoUrl}
                    alt={t(locale, "vehicle_photo")}
                    className="mt-2 h-28 w-40 rounded-md border border-[var(--border)] object-cover"
                  />
                ) : null}
              </dd>
            </div>
          )}
          {commercial && (
            <div>
              <dt className="text-[var(--muted)]">
                {t(locale, "commercial_section")}
              </dt>
              <dd className="mt-1 space-y-1">
                {commercial.company ? (
                  <p>
                    {t(locale, "commercial_company")}:{" "}
                    <strong>{commercial.company}</strong>
                  </p>
                ) : null}
                {commercial.matricule ? (
                  <p>
                    {t(locale, "commercial_matricule")}:{" "}
                    <strong>{commercial.matricule}</strong>
                  </p>
                ) : null}
                {commercial.insurance ? (
                  <p>
                    {t(locale, "commercial_insurance")}:{" "}
                    <strong>{commercial.insurance}</strong>
                  </p>
                ) : null}
                {commercial.base ? (
                  <p>
                    {t(locale, "commercial_base")}:{" "}
                    <strong>{commercial.base}</strong>
                  </p>
                ) : null}
              </dd>
            </div>
          )}
          {userNotes ? (
            <div>
              <dt className="text-[var(--muted)]">{t(locale, "notes")}</dt>
              <dd>{userNotes}</dd>
            </div>
          ) : null}
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
            <p className="font-medium">
              {trip.user.displayName}
              {trip.user.verifiedAt || trip.user.kycStatus === "VERIFIED"
                ? ` · ${t(locale, "verified")}`
                : ""}
            </p>
            {trip.user.phone ? (
              <p className="text-sm">
                {t(locale, "phone")}: {trip.user.phone}
              </p>
            ) : null}
            {trip.user.country ? (
              <p className="text-sm text-[var(--muted)]">
                {t(locale, "country")}: {trip.user.country}
              </p>
            ) : null}
            {trip.user.ratingCount ? (
              <p className="text-sm text-[var(--muted)]">
                ★ {trip.user.ratingAvg.toFixed(1)} ({trip.user.ratingCount})
              </p>
            ) : null}
          </div>
        </div>
      </Card>

      {isTripOwner && (
        <>
          {trip.priceNegotiable && (
            <TripActiveNegotiations tripId={trip.id} />
          )}
          <div id="matches">
            <TripSuggestedRequests tripId={trip.id} />
          </div>
        </>
      )}

      {me && !isTripOwner && trip.status === "OPEN" && (
        <SenderProposePanel
          tripId={trip.id}
          priceNegotiable={trip.priceNegotiable}
          listedPricePerKg={trip.pricePerKgCad}
          currency={trip.currency || "CAD"}
        />
      )}
    </div>
  );
}
