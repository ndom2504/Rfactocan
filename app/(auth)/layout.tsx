import Link from "next/link";
import { getRequestLocale } from "@/lib/locale";
import { LocaleToggle } from "@/components/locale-toggle";
import { LocaleProvider } from "@/components/locale-provider";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getRequestLocale();

  return (
    <LocaleProvider locale={locale}>
      <div className="min-h-screen">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-2xl font-semibold"
          >
            Rfacto
          </Link>
          <LocaleToggle locale={locale} />
        </header>
        {children}
      </div>
    </LocaleProvider>
  );
}
