import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getRequestLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { LocaleToggle } from "@/components/locale-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { PresenceHeartbeat } from "@/components/presence-heartbeat";
import { LocaleProvider } from "@/components/locale-provider";
import { ProfileMenu } from "@/components/profile-menu";
import { Badge } from "@/components/ui/badge";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const locale = await getRequestLocale();

  const links = [
    { href: "/dashboard", label: t(locale, "nav_dashboard") },
    { href: "/trips", label: t(locale, "nav_trips") },
    { href: "/requests", label: t(locale, "nav_requests") },
    { href: "/bookings", label: t(locale, "nav_bookings") },
    { href: "/messages", label: t(locale, "nav_messages") },
  ];

  return (
    <LocaleProvider locale={locale}>
      <PresenceHeartbeat />
      <div className="min-h-screen">
        <header className="border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
            <div className="flex items-center gap-6">
              <Link
                href="/dashboard"
                className="font-[family-name:var(--font-display)] text-xl font-semibold"
              >
                Rfacto
              </Link>
              <nav className="hidden gap-4 md:flex">
                {links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
                  >
                    {l.label}
                  </Link>
                ))}
                {user.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    className="text-sm font-medium text-[var(--highlight)]"
                  >
                    {t(locale, "nav_admin")}
                  </Link>
                )}
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <LocaleToggle locale={locale} />
              <NotificationBell locale={locale} />
              {user.verifiedAt && (
                <Badge className="bg-[var(--accent-soft)] text-[var(--accent)]">
                  {t(locale, "verified")}
                </Badge>
              )}
              <ProfileMenu
                displayName={user.displayName}
                avatarUrl={user.avatarUrl}
              />
            </div>
          </div>
          <nav className="mx-auto flex max-w-6xl gap-3 overflow-x-auto px-6 pb-3 md:hidden">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="whitespace-nowrap text-sm text-[var(--muted)]"
              >
                {l.label}
              </Link>
            ))}
            {user.role === "ADMIN" && (
              <Link
                href="/admin"
                className="whitespace-nowrap text-sm font-medium text-[var(--highlight)]"
              >
                {t(locale, "nav_admin")}
              </Link>
            )}
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </div>
    </LocaleProvider>
  );
}
