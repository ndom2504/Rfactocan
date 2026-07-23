import Image from "next/image";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getRequestLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const locale = await getRequestLocale();
  const user = await getSessionUser();
  const startHref = user ? "/dashboard" : "/login";

  return (
    <main>
      <section className="relative min-h-[calc(100vh-5.5rem)] overflow-hidden">
        <Image
          src="/images/hero-travel.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-45"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(160deg, rgba(11,61,46,0.94) 0%, rgba(11,61,46,0.72) 48%, rgba(26,92,69,0.45) 100%)",
          }}
        />
        <div className="relative mx-auto flex min-h-[calc(100vh-5.5rem)] max-w-3xl flex-col items-center justify-center px-6 py-20 text-center text-white">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-white/70">
            RapidFacto
          </p>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-5xl font-semibold leading-[1.05] md:text-7xl">
            Rfacto
          </h1>
          <p className="mt-6 max-w-md text-lg text-white/90 md:text-xl">
            {t(locale, "hero_tagline")}
          </p>

          <div className="mt-10 flex w-full max-w-sm flex-col items-center gap-3">
            <Link href={startHref} className="w-full">
              <Button
                size="lg"
                className="h-14 w-full bg-white text-base font-semibold text-[var(--hero-from)] shadow-lg shadow-black/20 hover:bg-white/90"
              >
                {t(locale, "cta_start_here")}
              </Button>
            </Link>
            <Link href="/about" className="w-full">
              <Button
                size="lg"
                variant="outline"
                className="h-12 w-full border-white/45 bg-transparent text-sm font-medium text-white/95 hover:bg-white/10"
              >
                {t(locale, "cta_about_us")}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
