import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatKg } from "@/lib/utils";
import { getCountryName, URGENCY_LABELS } from "@/lib/corridors";

export default async function RequestsPage() {
  const requests = await prisma.parcelRequest.findMany({
    where: { status: "OPEN" },
    include: {
      user: {
        select: { displayName: true, verifiedAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
            Demandes de colis
          </h1>
          <p className="text-[var(--muted)]">
            Besoins d&apos;expédition publiés par les particuliers.
          </p>
        </div>
        <Link href="/requests/new">
          <Button>Publier une demande</Button>
        </Link>
      </div>

      <div className="grid gap-4">
        {requests.map((req) => (
          <Card key={req.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle>
                  {req.fromCity} → {req.toCity}
                </CardTitle>
                <CardDescription>
                  {getCountryName(req.toCountry)} · {formatKg(req.weightKg)} ·{" "}
                  {URGENCY_LABELS[req.urgency]}
                  {req.desiredDate ? ` · souhaité ${formatDate(req.desiredDate)}` : ""}
                </CardDescription>
                <p className="mt-3 line-clamp-2 text-sm text-[var(--muted)]">
                  {req.description}
                </p>
                <div className="mt-3">
                  <Badge>{req.user.displayName}</Badge>
                </div>
              </div>
              <Link href={`/requests/${req.id}`}>
                <Button variant="outline">Matcher</Button>
              </Link>
            </div>
          </Card>
        ))}
        {requests.length === 0 && (
          <p className="text-sm text-[var(--muted)]">Aucune demande ouverte.</p>
        )}
      </div>
    </div>
  );
}
