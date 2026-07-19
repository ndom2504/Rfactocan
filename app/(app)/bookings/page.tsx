import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRequestLocale } from "@/lib/locale";
import { t, bookingStatusLabel } from "@/lib/i18n";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatKg } from "@/lib/utils";

export default async function BookingsPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const locale = await getRequestLocale();

  const bookings = await prisma.booking.findMany({
    where: {
      OR: [{ senderId: user.id }, { trip: { userId: user.id } }],
    },
    include: {
      request: true,
      payment: true,
      trip: {
        include: {
          user: { select: { displayName: true } },
        },
      },
      sender: { select: { displayName: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6" data-tour="bookings">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          {t(locale, "bookings_title")}
        </h1>
        <p className="text-[var(--muted)]">{t(locale, "bookings_subtitle")}</p>
      </div>
      <div className="space-y-3">
        {bookings.map((b) => {
          const role =
            b.senderId === user.id
              ? t(locale, "sender")
              : t(locale, "traveler");
          return (
            <Card key={b.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">
                    {b.request.fromCity} → {b.request.toCity}
                  </CardTitle>
                  <CardDescription>
                    {role} · {formatKg(b.request.weightKg)} ·{" "}
                    {t(locale, "departure_date")} {formatDate(b.trip.departAt)}
                  </CardDescription>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge>{bookingStatusLabel(locale, b.status)}</Badge>
                    {b.status === "AWAITING_PAYMENT" &&
                      b.senderId === user.id && (
                        <Badge className="bg-[var(--accent-soft)] text-[var(--accent)]">
                          {t(locale, "to_pay")}
                        </Badge>
                      )}
                    {b.payment?.status === "AUTHORIZED" && (
                      <Badge className="bg-[var(--accent-soft)] text-[var(--accent)]">
                        {t(locale, "funds_held")}
                      </Badge>
                    )}
                    {b.payment?.status === "CAPTURED" && (
                      <Badge className="bg-[var(--accent-soft)] text-[var(--accent)]">
                        {t(locale, "paid")}
                      </Badge>
                    )}
                  </div>
                </div>
                <Link href={`/bookings/${b.id}`}>
                  <Button variant="outline" size="sm">
                    {b.status === "AWAITING_PAYMENT" && b.senderId === user.id
                      ? t(locale, "pay")
                      : t(locale, "open")}
                  </Button>
                </Link>
              </div>
            </Card>
          );
        })}
        {bookings.length === 0 && (
          <p className="text-sm text-[var(--muted)]">
            {t(locale, "no_bookings")}
          </p>
        )}
      </div>
    </div>
  );
}
