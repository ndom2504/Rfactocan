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

  const [bookings, dmThreads] = await Promise.all([
    prisma.booking.findMany({
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
    }),
    prisma.directThread.findMany({
      where: {
        OR: [{ userLowId: user.id }, { userHighId: user.id }],
      },
      include: {
        userLow: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        userHigh: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
      take: 40,
    }),
  ]);

  type Row = {
    key: string;
    type: "booking" | "dm";
    href: string;
    name: string;
    avatarUrl?: string | null;
    title: string;
    preview: string;
    date: Date | null;
  };

  const rows: Row[] = [];

  for (const b of bookings) {
    const isSender = b.senderId === user.id;
    const other = isSender ? b.trip.user : b.sender;
    const last = b.messages[0];
    const preview = last
      ? last.attachmentUrl
        ? `📎 ${last.body?.slice(0, 60) || t(locale, "attachment_label")}`
        : `${last.body.slice(0, 80)}${last.body.length > 80 ? "…" : ""}`
      : t(locale, "no_messages");
    rows.push({
      key: `b-${b.id}`,
      type: "booking",
      href: `/bookings/${b.id}`,
      name: other.displayName,
      avatarUrl: other.avatarUrl,
      title: `${other.displayName} · ${b.request.fromCity} → ${b.request.toCity}`,
      preview,
      date: last?.createdAt ?? b.updatedAt,
    });
  }

  for (const th of dmThreads) {
    const peer = th.userLowId === user.id ? th.userHigh : th.userLow;
    const last = th.messages[0];
    const ctx =
      th.lastContextType === "JOB"
        ? t(locale, "dm_context_job")
        : th.lastContextType === "SERVICE"
          ? t(locale, "dm_context_service")
          : th.lastContextType === "IN"
            ? t(locale, "dm_context_in")
            : t(locale, "dm_direct_chat");
    const preview = last
      ? last.attachmentUrl
        ? `📎 ${last.body?.slice(0, 60) || t(locale, "attachment_label")}`
        : `${last.body.slice(0, 80)}${last.body.length > 80 ? "…" : ""}`
      : t(locale, "no_messages");
    rows.push({
      key: `dm-${th.id}`,
      type: "dm",
      href: `/messages/dm/${th.id}`,
      name: peer.displayName,
      avatarUrl: peer.avatarUrl,
      title: `${peer.displayName} · ${ctx}`,
      preview,
      date: last?.createdAt ?? th.lastMessageAt ?? th.updatedAt,
    });
  }

  rows.sort((a, b) => {
    const ta = a.date?.getTime() ?? 0;
    const tb = b.date?.getTime() ?? 0;
    return tb - ta;
  });

  return (
    <div className="space-y-6" data-tour="messages">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          {t(locale, "messages_title")}
        </h1>
        <p className="text-[var(--muted)]">{t(locale, "messages_subtitle")}</p>
        <Link
          href="/service-payments"
          className="mt-2 inline-block text-sm font-medium text-[var(--accent)] underline underline-offset-2"
        >
          {t(locale, "svc_pay_inbox")}
        </Link>
      </div>
      <div className="space-y-3">
        {rows.map((row) => (
          <Card key={row.key}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <UserAvatar
                  name={row.name}
                  avatarUrl={row.avatarUrl}
                  size="lg"
                />
                <div className="min-w-0">
                  <CardTitle className="text-base">{row.title}</CardTitle>
                  <CardDescription>
                    {row.preview}
                    {row.date ? ` · ${formatDate(row.date)}` : ""}
                  </CardDescription>
                </div>
              </div>
              <Link href={row.href}>
                <Button variant="outline" size="sm">
                  {t(locale, "open")}
                </Button>
              </Link>
            </div>
          </Card>
        ))}
        {rows.length === 0 && (
          <p className="text-sm text-[var(--muted)]">
            {t(locale, "no_messages")}
          </p>
        )}
      </div>
    </div>
  );
}
