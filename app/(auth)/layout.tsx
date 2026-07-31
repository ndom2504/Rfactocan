import Link from "next/link";
import { AuthSlidesBackdrop } from "@/components/auth-slides-backdrop";
import { LocaleToggle } from "@/components/locale-toggle";
import { LocaleProvider } from "@/components/locale-provider";
import { getRequestLocale } from "@/lib/locale";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getRequestLocale();

  return (
    <LocaleProvider locale={locale}>
      <div className="relative isolate min-h-screen overflow-hidden">
        <AuthSlidesBackdrop />

        <div className="relative z-10 flex min-h-screen flex-col">
          <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
            <Link
              href="/"
              className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-white drop-shadow-sm"
            >
              Rfacto
            </Link>
            <div className="rounded-full border border-white/20 bg-white/15 p-1 backdrop-blur-md">
              <LocaleToggle locale={locale} />
            </div>
          </header>

          <main className="mx-auto flex w-full max-w-md flex-1 items-center px-6 pb-12 pt-2">
            <div className="w-full [&_[data-auth-card]]:border-[var(--rfacto-green)]/20 [&_[data-auth-card]]:bg-[var(--rfacto-white)]/94 [&_[data-auth-card]]:shadow-[0_24px_60px_rgba(27,59,20,0.35)] [&_[data-auth-card]]:backdrop-blur-md">
              {children}
            </div>
          </main>
        </div>
      </div>
    </LocaleProvider>
  );
}
