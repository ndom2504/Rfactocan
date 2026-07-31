import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRequestLocale } from "@/lib/locale";
import { t, bookingStatusLabel } from "@/lib/i18n";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardSearchHub } from "@/components/dashboard-search-hub";
import { WhatsAppCommunityButton } from "@/components/whatsapp-community-button";
import { AmbassadorEarnPanel } from "@/components/ambassador-earn-panel";
import { getAmbassadorKpis } from "@/lib/ambassador-stats";
import { formatDate, formatKg } from "@/lib/utils";
import { getCountryName } from "@/lib/corridors";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const locale = await getRequestLocale();

  const canSearchLivreurs =
    user.role === "SENDER" || user.role === "BOTH" || user.role === "ADMIN";
  const canSearchCommandes =
    user.role === "TRAVELER" || user.role === "BOTH" || user.role === "ADMIN";

  const showAmbassadorEarn =
    user.isAmbassador &&
    user.kycStatus === "VERIFIED" &&
    Boolean(user.agentCode);

  const [trips, requests, bookings, ambassadorKpis, ambProfile] =
    await Promise.all([
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
      showAmbassadorEarn ? getAmbassadorKpis(user.id) : Promise.resolve(null),
      prisma.user.findUnique({
        where: { id: user.id },
        select: { ambassadorRequestStatus: true },
      }),
    ]);

  const ambPending = ambProfile?.ambassadorRequestStatus === "PENDING";

  return (
    <div className="space-y-8">
      <div className="text-center" data-tour="welcome">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          {t(locale, "hello")}, {user.displayName}
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-[var(--muted)]">
          {t(locale, "dashboard_subtitle")}
        </p>
        <p className="mx-auto mt-1 max-w-xl text-sm text-[var(--muted)]">
          {t(locale, "dashboard_actors_hint")}
        </p>
      </div>

      {showAmbassadorEarn && user.agentCode ? (
        <AmbassadorEarnPanel
          agentCode={user.agentCode}
          displayName={user.displayName}
          initialKpis={ambassadorKpis ?? undefined}
          collapsedByDefault
        />
      ) : !user.isAmbassador ? (
        <div className="mx-auto flex w-full max-w-md justify-center">
          <Link href="/ambassador/apply" className="w-full">
            <Button className="h-12 w-full text-base" variant="outline">
              {ambPending
                ? t(locale, "ambassador_apply_pending_cta")
                : t(locale, "ambassador_become_cta")}
            </Button>
          </Link>
        </div>
      ) : null}

      <div
        className="mx-auto flex w-full max-w-md flex-col items-stretch gap-3"
        data-tour="publish-ctas"
      >
        <Link href="/trips/new" className="w-full">
          <Button className="h-12 w-full text-base">
            {t(locale, "publish_trip_cta")}
          </Button>
        </Link>
        <Link href="/services/new" className="w-full">
          <Button className="h-12 w-full text-base">
            {t(locale, "publish_service_cta")}
          </Button>
        </Link>
        <Link href="/shops/new" className="w-full">
          <Button className="h-12 w-full text-base">
            {t(locale, "publish_shop_cta")}
          </Button>
        </Link>
        <Link href="/shops" className="w-full">
          <Button
            className="h-12 w-full text-base"
            variant="outline"
          >
            {t(locale, "shops_browse")}
          </Button>
        </Link>
        <Link href="/requests/new" className="w-full">
          <Button
            className="h-12 w-full border-[var(--accent)]/25 bg-[var(--accent-soft)] text-base text-[var(--accent)] hover:bg-[#c5e6d6]"
            variant="outline"
          >
            {t(locale, "publish_order_cta")}
          </Button>
        </Link>
      </div>

      <div data-tour="search">
        <DashboardSearchHub
          canSearchLivreurs={canSearchLivreurs}
          canSearchCommandes={canSearchCommandes}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3" data-tour="stats">
        <Card>
          <CardDescription>{t(locale, "open_trips")}</CardDescription>
          <CardTitle className="mt-2 text-3xl">{trips}</CardTitle>
        </Card>
        <Card>
          <CardDescription>{t(locale, "open_requests")}</CardDescription>
          <CardTitle className="mt-2 text-3xl">{requests}</CardTitle>
        </Card>
        <Card>
          <CardDescription>{t(locale, "avg_rating")}</CardDescription>
          <CardTitle className="mt-2 text-3xl">
            {user.ratingCount ? user.ratingAvg.toFixed(1) : "—"}
          </CardTitle>
        </Card>
      </div>

      <section data-tour="activity">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          {t(locale, "recent_activity")}
        </h2>
        <div className="mt-4 space-y-3">
          {bookings.length === 0 && (
            <p className="text-sm text-[var(--muted)]">
              {t(locale, "no_bookings_yet")}
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
                      {formatKg(b.request.weightKg)} ·{" "}
                      {formatDate(b.trip.departAt)} ·{" "}
                      {bookingStatusLabel(locale, b.status)}
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    {t(locale, "open")}
                  </Button>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>
      <WhatsAppCommunityButton label={t(locale, "cta_join_whatsapp")} />
    </div>
  );
}
