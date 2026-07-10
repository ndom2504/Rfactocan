import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRequestLocale } from "@/lib/locale";
import { t, urgencyLabel } from "@/lib/i18n";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";
import { ListingOwnerActions } from "@/components/listing-owner-actions";
import { formatDate, formatKg } from "@/lib/utils";
import { getCountryName } from "@/lib/corridors";

type Props = { searchParams: Promise<{ mine?: string }> };

export default async function RequestsPage({ searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) return null;
  const locale = await getRequestLocale();
  const { mine } = await searchParams;
  const mineOnly = mine === "1";

  const requests = await prisma.parcelRequest.findMany({
    where: mineOnly
      ? { userId: user.id, status: { not: "CANCELLED" } }
      : { status: "OPEN" },
    include: {
      user: {
        select: {
          displayName: true,
          verifiedAt: true,
          avatarUrl: true,
          kycStatus: true,
        },
      },
      bookings: {
        where: {
          OR: [{ senderId: user.id }, { trip: { userId: user.id } }],
          status: { notIn: ["CANCELLED", "REFUSED"] },
        },
        select: { id: true, status: true },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
            {mineOnly ? t(locale, "my_requests") : t(locale, "requests_title")}
          </h1>
          <p className="text-[var(--muted)]">
            {t(locale, "requests_subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {mineOnly ? (
            <Link
              href="/requests"
              className={buttonVariants({ variant: "outline" })}
            >
              {t(locale, "show_all_requests")}
            </Link>
          ) : (
            <Link
              href="/requests?mine=1"
              className={buttonVariants({ variant: "outline" })}
            >
              {t(locale, "my_requests")}
            </Link>
          )}
          <Link href="/requests/new" className={buttonVariants()}>
            {t(locale, "publish_request")}
          </Link>
        </div>
      </div>

      <div className="grid gap-4">
        {requests.map((req) => {
          const photos = JSON.parse(req.photosJson || "[]") as string[];
          const cover = photos[0];
          const isOwner = req.userId === user.id;
          const existing = req.bookings[0];
          return (
            <Card key={req.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>
                      {req.fromCity} → {req.toCity}
                    </CardTitle>
                    {isOwner && (
                      <Badge className="bg-[var(--accent-soft)] text-[var(--accent)]">
                        {t(locale, "my_listing")}
                      </Badge>
                    )}
                  </div>
                  <CardDescription>
                    {getCountryName(req.toCountry)} · {formatKg(req.weightKg)} ·{" "}
                    {urgencyLabel(locale, req.urgency)}
                    {req.desiredDate
                      ? ` · ${t(locale, "desired_date")} ${formatDate(req.desiredDate)}`
                      : ""}
                  </CardDescription>
                  <p className="mt-3 line-clamp-2 text-sm text-[var(--muted)]">
                    {req.description}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {(req.user.verifiedAt ||
                      req.user.kycStatus === "VERIFIED") && (
                      <Badge className="bg-[var(--accent-soft)] text-[var(--accent)]">
                        {t(locale, "verified")}
                      </Badge>
                    )}
                    {photos.length > 1 && (
                      <Badge>+{photos.length - 1}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {existing ? (
                    <Link
                      href={`/bookings/${existing.id}`}
                      className={buttonVariants()}
                    >
                      {t(locale, "open_booking")}
                    </Link>
                  ) : isOwner ? (
                    <Link
                      href={`/requests/${req.id}`}
                      className={buttonVariants({ variant: "outline" })}
                    >
                      {t(locale, "details")}
                    </Link>
                  ) : (
                    <Link
                      href={`/requests/${req.id}#apply`}
                      className={buttonVariants()}
                    >
                      {t(locale, "apply")}
                    </Link>
                  )}
                  {isOwner && (
                    <ListingOwnerActions
                      kind="request"
                      id={req.id}
                      editHref={`/requests/${req.id}/edit`}
                    />
                  )}
                </div>
              </div>

              <div className="mt-5 grid gap-4 border-t border-[var(--border)] pt-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-2)]">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cover}
                        alt={`${req.fromCity} → ${req.toCity}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-[var(--muted)]">
                        {t(locale, "no_parcel_photo")}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-[var(--muted)]">
                      {t(locale, "parcel_photo")}
                    </p>
                    <p className="text-sm font-medium">
                      {cover
                        ? t(locale, "parcel_photos")
                        : t(locale, "no_parcel_photo")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name={req.user.displayName}
                    avatarUrl={req.user.avatarUrl}
                    size="xl"
                  />
                  <div className="min-w-0">
                    <p className="text-xs text-[var(--muted)]">
                      {t(locale, "profile_photo")}
                    </p>
                    <p className="font-medium">{req.user.displayName}</p>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
        {requests.length === 0 && (
          <p className="text-sm text-[var(--muted)]">
            {t(locale, "no_requests")}
          </p>
        )}
      </div>
    </div>
  );
}
