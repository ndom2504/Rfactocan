import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getRequestLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { LocaleToggle } from "@/components/locale-toggle";
import { LocaleProvider } from "@/components/locale-provider";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  const locale = await getRequestLocale();

  return (
    <LocaleProvider locale={locale}>
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
        <footer className="mx-auto max-w-6xl border-t border-[var(--border)] px-6 py-8">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--muted)]">
            <p>© {new Date().getFullYear()} Rfacto · RapidFacto</p>
            <div className="flex flex-wrap gap-4">
              <Link href="/about" className="hover:text-[var(--foreground)]">
                {t(locale, "cta_about_us")}
              </Link>
              <Link
                href="/responsibility"
                className="hover:text-[var(--foreground)]"
              >
                {t(locale, "nav_responsibility")}
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </LocaleProvider>
  );
}
