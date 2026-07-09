import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";
import { formatDate, formatKg } from "@/lib/utils";
import { getCountryName, URGENCY_LABELS } from "@/lib/corridors";

export default async function RequestsPage() {
  const requests = await prisma.parcelRequest.findMany({
    where: { status: "OPEN" },
    include: {
      user: {
        select: {
          displayName: true,
          verifiedAt: true,
          avatarUrl: true,
          kycStatus: true,
        },
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
        {requests.map((req) => {
          const photos = JSON.parse(req.photosJson || "[]") as string[];
          const cover = photos[0];
          return (
            <Card key={req.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 flex-1 gap-4">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-2)]">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cover}
                        alt={`Colis ${req.fromCity} → ${req.toCity}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-[var(--muted)]">
                        Pas de photo
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <UserAvatar
                        name={req.user.displayName}
                        avatarUrl={req.user.avatarUrl}
                        size="sm"
                      />
                      <CardTitle>
                        {req.fromCity} → {req.toCity}
                      </CardTitle>
                    </div>
                    <CardDescription>
                      {getCountryName(req.toCountry)} · {formatKg(req.weightKg)}{" "}
                      · {URGENCY_LABELS[req.urgency]}
                      {req.desiredDate
                        ? ` · souhaité ${formatDate(req.desiredDate)}`
                        : ""}
                    </CardDescription>
                    <p className="mt-3 line-clamp-2 text-sm text-[var(--muted)]">
                      {req.description}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge>{req.user.displayName}</Badge>
                      {(req.user.verifiedAt ||
                        req.user.kycStatus === "VERIFIED") && (
                        <Badge className="bg-[var(--accent-soft)] text-[var(--accent)]">
                          Vérifié
                        </Badge>
                      )}
                      {photos.length > 1 && (
                        <Badge>+{photos.length - 1} photo(s)</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Link href={`/requests/${req.id}`}>
                  <Button variant="outline">Matcher</Button>
                </Link>
              </div>
            </Card>
          );
        })}
        {requests.length === 0 && (
          <p className="text-sm text-[var(--muted)]">Aucune demande ouverte.</p>
        )}
      </div>
    </div>
  );
}
