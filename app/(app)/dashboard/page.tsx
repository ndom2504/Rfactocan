import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRequestLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { isStripeConfigured } from "@/lib/stripe";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TravelerSearch } from "@/components/traveler-search";
import { PaymentReadinessCard } from "@/components/payment-readiness";
import { formatDate, formatKg } from "@/lib/utils";
import { getCountryName, BOOKING_STATUS_LABELS } from "@/lib/corridors";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const locale = await getRequestLocale();

  const [trips, requests, bookings, dbUser] = await Promise.all([
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
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        kycStatus: true,
        stripeConnectChargesEnabled: true,
        stripeConnectPayoutsEnabled: true,
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          {locale === "en" ? "Hello" : "Bonjour"}, {user.displayName}
        </h1>
        <p className="mt-1 text-[var(--muted)]">
          {locale === "en"
            ? "Manage your trips, requests and international bookings."
            : "Gérez vos voyages, demandes et réservations internationales."}
        </p>
      </div>

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

      <PaymentReadinessCard
        locale={locale}
        kycStatus={dbUser?.kycStatus ?? "NONE"}
        connectCharges={Boolean(dbUser?.stripeConnectChargesEnabled)}
        connectPayouts={Boolean(dbUser?.stripeConnectPayoutsEnabled)}
        stripeConfigured={isStripeConfigured()}
      />

      <div className="flex flex-wrap gap-3">
        <Link href="/trips/new">
          <Button>{t(locale, "publish_trip")}</Button>
        </Link>
        <Link href="/requests/new">
          <Button variant="secondary">{t(locale, "publish_request")}</Button>
        </Link>
      </div>

      <TravelerSearch />

      <section>
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          {t(locale, "recent_activity")}
        </h2>
        <div className="mt-4 space-y-3">
          {bookings.length === 0 && (
            <p className="text-sm text-[var(--muted)]">
              {locale === "en"
                ? "No bookings yet. Post a trip or a request to get started."
                : "Aucune réservation pour le moment. Publiez un voyage ou une demande pour commencer."}
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
                      {BOOKING_STATUS_LABELS[b.status] ?? b.status}
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    {locale === "en" ? "Open" : "Ouvrir"}
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
