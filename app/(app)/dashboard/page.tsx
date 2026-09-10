import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { userSatisfiesKyc } from "@/lib/kyc-policy";
import { prisma } from "@/lib/prisma";
import { getRequestLocale } from "@/lib/locale";
import { t, bookingStatusLabel } from "@/lib/i18n";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AmbassadorEarnPanel } from "@/components/ambassador-earn-panel";
import { DashboardWelcomeBanner } from "@/components/dashboard-welcome-banner";
import { getAmbassadorKpis } from "@/lib/ambassador-stats";
import { formatDate, formatKg } from "@/lib/utils";
import { getCountryName } from "@/lib/corridors";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const locale = await getRequestLocale();

  const showAmbassadorEarn =
    user.isAmbassador && Boolean(user.agentCode);

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
      showAmbassadorEarn
        ? getAmbassadorKpis(user.id).catch((e) => {
            console.error("Dashboard ambassador KPIs failed:", e);
            return null;
          })
        : Promise.resolve(null),
      prisma.user.findUnique({
        where: { id: user.id },
        select: { ambassadorRequestStatus: true },
      }),
    ]);

  const ambPending = ambProfile?.ambassadorRequestStatus === "PENDING";

  return (
    <div>
      <DashboardWelcomeBanner
        displayName={user.displayName}
        avatarUrl={user.avatarUrl}
        bannerUrl={user.bannerUrl}
        kycVerified={userSatisfiesKyc(user)}
      />

      <div className="mx-auto max-w-6xl space-y-8 px-6 py-8">
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
        <Link href="/services/new" className="w-full">
          <Button
            variant="outline"
            className="h-12 w-full border-[var(--accent)] bg-transparent text-base text-[var(--accent)] shadow-none hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
          >
            {t(locale, "dashboard_publish_service")}
          </Button>
        </Link>
        <Link href="/services" className="w-full" data-tour="search">
          <Button
            variant="outline"
            className="h-12 w-full border-[var(--accent)] bg-transparent text-base text-[var(--accent)] shadow-none hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
          >
            {t(locale, "dashboard_search_service")}
          </Button>
        </Link>
        <Link href="/projects" className="w-full">
          <Button
            variant="outline"
            className="h-12 w-full border-[var(--accent)] bg-transparent text-base text-[var(--accent)] shadow-none hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
          >
            {t(locale, "my_projects_title")}
          </Button>
        </Link>
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
      </div>
    </div>
  );
}
