import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRequestLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { formatMoneyFromCents } from "@/lib/currency";

function statusKey(status: string) {
  switch (status) {
    case "AWAITING_PAYMENT":
      return "svc_pay_status_AWAITING_PAYMENT" as const;
    case "AWAITING_CONFIRMATION":
      return "svc_pay_status_AWAITING_CONFIRMATION" as const;
    case "PAID":
      return "svc_pay_status_PAID" as const;
    case "CANCELLED":
      return "svc_pay_status_CANCELLED" as const;
    case "EXPIRED":
      return "svc_pay_status_EXPIRED" as const;
    default:
      return null;
  }
}

export default async function ServicePaymentsInboxPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const locale = await getRequestLocale();

  const payments = await prisma.servicePaymentRequest.findMany({
    where: {
      OR: [{ clientId: user.id }, { providerId: user.id }],
    },
    orderBy: { createdAt: "desc" },
    take: 60,
    include: {
      provider: { select: { displayName: true } },
      client: { select: { displayName: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          {t(locale, "svc_pay_inbox")}
        </h1>
        <p className="text-[var(--muted)]">{t(locale, "svc_pay_inbox_hint")}</p>
      </div>
      <div className="space-y-3">
        {payments.map((p) => {
          const iPay = p.clientId === user.id;
          const other = iPay ? p.provider.displayName : p.client.displayName;
          const status = statusKey(p.status);
          return (
            <Card key={p.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="text-base">{p.title}</CardTitle>
                  <CardDescription>
                    {iPay
                      ? t(locale, "svc_pay_you_pay")
                      : t(locale, "svc_pay_you_receive")}
                    {` · ${other} · ${formatMoneyFromCents(p.amountCents, p.currency)}`}
                    {status ? ` · ${t(locale, status)}` : ""}
                    {` · ${formatDate(p.createdAt)}`}
                  </CardDescription>
                </div>
                <Link href={`/service-payments/${p.id}`}>
                  <Button variant="outline" size="sm">
                    {t(locale, "svc_pay_open")}
                  </Button>
                </Link>
              </div>
            </Card>
          );
        })}
        {payments.length === 0 && (
          <p className="text-sm text-[var(--muted)]">
            {t(locale, "svc_pay_empty")}
          </p>
        )}
      </div>
    </div>
  );
}
