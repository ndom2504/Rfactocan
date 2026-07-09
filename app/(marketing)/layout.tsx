import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getRequestLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { LocaleToggle } from "@/components/locale-toggle";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  const locale = await getRequestLocale();

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight"
        >
          Rfacto
        </Link>
        <nav className="flex items-center gap-3">
          <LocaleToggle locale={locale} />
          {user ? (
            <Link href="/dashboard">
              <Button>{t(locale, "nav_dashboard")}</Button>
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                {t(locale, "nav_login")}
              </Link>
              <Link href="/register">
                <Button>{t(locale, "nav_signup")}</Button>
              </Link>
            </>
          )}
        </nav>
      </header>
      {children}
    </div>
  );
}
