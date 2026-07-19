import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRequestLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { formatDate } from "@/lib/utils";

export default async function MessagesPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const locale = await getRequestLocale();

  const bookings = await prisma.booking.findMany({
    where: {
      OR: [{ senderId: user.id }, { trip: { userId: user.id } }],
      status: { notIn: ["CANCELLED", "REFUSED"] },
    },
    include: {
      request: true,
      trip: {
        include: {
          user: { select: { displayName: true, avatarUrl: true } },
        },
      },
      sender: { select: { displayName: true, avatarUrl: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6" data-tour="messages">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          {t(locale, "messages_title")}
        </h1>
        <p className="text-[var(--muted)]">{t(locale, "messages_subtitle")}</p>
      </div>
      <div className="space-y-3">
        {bookings.map((b) => {
          const isSender = b.senderId === user.id;
          const other = isSender ? b.trip.user : b.sender;
          const last = b.messages[0];
          const preview = last
            ? last.attachmentUrl
              ? `📎 ${last.body?.slice(0, 60) || t(locale, "attachment_label")}`
              : `${last.body.slice(0, 80)}${last.body.length > 80 ? "…" : ""}`
            : t(locale, "no_messages");
          return (
            <Card key={b.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <UserAvatar
                    name={other.displayName}
                    avatarUrl={other.avatarUrl}
                    size="lg"
                  />
                  <div className="min-w-0">
                    <CardTitle className="text-base">
                      {other.displayName} · {b.request.fromCity} →{" "}
                      {b.request.toCity}
                    </CardTitle>
                    <CardDescription>
                      {preview}
                      {last ? ` · ${formatDate(last.createdAt)}` : ""}
                    </CardDescription>
                  </div>
                </div>
                <Link href={`/bookings/${b.id}`}>
                  <Button variant="outline" size="sm">
                    {t(locale, "open")}
                  </Button>
                </Link>
              </div>
            </Card>
          );
        })}
        {bookings.length === 0 && (
          <p className="text-sm text-[var(--muted)]">
            {t(locale, "no_messages")}
          </p>
        )}
      </div>
    </div>
  );
}
