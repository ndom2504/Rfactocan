import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BOOKING_STATUS_LABELS } from "@/lib/corridors";
import { formatDate, formatKg } from "@/lib/utils";

export default async function BookingsPage() {
  const user = await getSessionUser();
  if (!user) return null;

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
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          Réservations
        </h1>
        <p className="text-[var(--muted)]">
          Suivez vos propositions, paiements et livraisons.
        </p>
      </div>
      <div className="space-y-3">
        {bookings.map((b) => {
          const role = b.senderId === user.id ? "Expéditeur" : "Voyageur";
          return (
            <Card key={b.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">
                    {b.request.fromCity} → {b.request.toCity}
                  </CardTitle>
                  <CardDescription>
                    {role} · {formatKg(b.request.weightKg)} · départ{" "}
                    {formatDate(b.trip.departAt)}
                  </CardDescription>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge>{BOOKING_STATUS_LABELS[b.status] ?? b.status}</Badge>
                    {b.status === "AWAITING_PAYMENT" &&
                      b.senderId === user.id && (
                        <Badge className="bg-[var(--accent-soft)] text-[var(--accent)]">
                          À payer
                        </Badge>
                      )}
                    {b.payment?.status === "AUTHORIZED" && (
                      <Badge className="bg-[var(--accent-soft)] text-[var(--accent)]">
                        Fonds bloqués
                      </Badge>
                    )}
                    {b.payment?.status === "CAPTURED" && (
                      <Badge className="bg-[var(--accent-soft)] text-[var(--accent)]">
                        Payé
                      </Badge>
                    )}
                  </div>
                </div>
                <Link href={`/bookings/${b.id}`}>
                  <Button variant="outline" size="sm">
                    {b.status === "AWAITING_PAYMENT" && b.senderId === user.id
                      ? "Payer"
                      : "Ouvrir"}
                  </Button>
                </Link>
              </div>
            </Card>
          );
        })}
        {bookings.length === 0 && (
          <p className="text-sm text-[var(--muted)]">
            Aucune réservation. Proposez un voyageur depuis une demande.
          </p>
        )}
      </div>
    </div>
  );
}
