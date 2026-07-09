import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export default async function MessagesPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const bookings = await prisma.booking.findMany({
    where: {
      OR: [{ senderId: user.id }, { trip: { userId: user.id } }],
      status: { notIn: ["CANCELLED", "REFUSED"] },
    },
    include: {
      request: true,
      trip: { include: { user: { select: { displayName: true } } } },
      sender: { select: { displayName: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          Messages
        </h1>
        <p className="text-[var(--muted)]">
          Conversations liées à vos réservations.
        </p>
      </div>
      <div className="space-y-3">
        {bookings.map((b) => {
          const other =
            b.senderId === user.id
              ? b.trip.user.displayName
              : b.sender.displayName;
          const last = b.messages[0];
          return (
            <Card key={b.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">
                    {other} · {b.request.fromCity} → {b.request.toCity}
                  </CardTitle>
                  <CardDescription>
                    {last
                      ? `${last.body.slice(0, 80)}${last.body.length > 80 ? "…" : ""} · ${formatDate(last.createdAt)}`
                      : "Aucun message encore"}
                  </CardDescription>
                </div>
                <Link href={`/bookings/${b.id}`}>
                  <Button variant="outline" size="sm">
                    Ouvrir
                  </Button>
                </Link>
              </div>
            </Card>
          );
        })}
        {bookings.length === 0 && (
          <p className="text-sm text-[var(--muted)]">
            Aucune conversation active.
          </p>
        )}
      </div>
    </div>
  );
}
