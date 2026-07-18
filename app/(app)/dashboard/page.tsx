import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRequestLocale } from "@/lib/locale";
import { t, bookingStatusLabel } from "@/lib/i18n";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardSearchHub } from "@/components/dashboard-search-hub";
import { ResponsibilityNotice } from "@/components/responsibility-notice";
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
          {t(locale, "hello")}, {user.displayName}
        </h1>
        <p className="mt-1 text-[var(--muted)]">
          {t(locale, "dashboard_subtitle")}
        </p>
      </div>

      <DashboardSearchHub
        canSearchLivreurs={canSearchLivreurs}
        canSearchCommandes={canSearchCommandes}
      />

      <div className="grid gap-4 sm:grid-cols-3">
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

      <div className="flex flex-wrap gap-3">
        <Link href="/services">
          <Button>{t(locale, "nav_services")}</Button>
        </Link>
        <Link href="/services/new">
          <Button variant="secondary">{t(locale, "services_publish")}</Button>
        </Link>
        {(user.role === "TRAVELER" ||
          user.role === "BOTH" ||
          user.role === "ADMIN") && (
          <Link href="/trips/new">
            <Button variant="outline">{t(locale, "publish_trip")}</Button>
          </Link>
        )}
        {(user.role === "SENDER" ||
          user.role === "BOTH" ||
          user.role === "ADMIN") && (
          <Link href="/requests/new">
            <Button variant="outline">{t(locale, "publish_request")}</Button>
          </Link>
        )}
      </div>

      <ResponsibilityNotice locale={locale} />

      <section>
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
  );
}
