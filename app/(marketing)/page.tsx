import type { Metadata } from "next";
import Link from "next/link";
import { HomeHeroCarousel } from "@/components/home-hero-carousel";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import { getRequestLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { getWhatsAppCommunityUrl } from "@/lib/whatsapp-community";

const homeOg = "https://www.rfacto.com/og-communaute.jpg";

export const metadata: Metadata = {
  openGraph: {
    images: [
      {
        url: homeOg,
        secureUrl: homeOg,
        type: "image/jpeg",
        width: 1200,
        height: 675,
        alt: "Rfacto",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [homeOg],
  },
};

export default async function HomePage() {
  const locale = await getRequestLocale();
  const user = await getSessionUser();
  const startHref = user ? "/dashboard" : "/login";
  const whatsappUrl = await getWhatsAppCommunityUrl();

  return (
    <main className="pb-4">
      <HomeHeroCarousel startHref={startHref} whatsappUrl={whatsappUrl} />

      <section className="mx-auto mt-10 max-w-5xl px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              title: t(locale, "home_pillar_connect_title"),
              text: t(locale, "home_pillar_connect_text"),
            },
            {
              title: t(locale, "home_pillar_ship_title"),
              text: t(locale, "home_pillar_ship_text"),
            },
            {
              title: t(locale, "home_pillar_grow_title"),
              text: t(locale, "home_pillar_grow_text"),
            },
          ].map((pillar) => (
            <article
              key={pillar.title}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 p-5 shadow-sm backdrop-blur-sm"
            >
              <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--accent)]">
                {pillar.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                {pillar.text}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/about">
            <Button variant="outline">{t(locale, "cta_about_us")}</Button>
          </Link>
          <Link href={user ? "/dashboard" : "/register"}>
            <Button>{t(locale, "cta_start_here")}</Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
