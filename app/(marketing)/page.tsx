import Image from "next/image";
import Link from "next/link";
import { getRequestLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const locale = await getRequestLocale();

  const steps = [
    {
      title: t(locale, "step_publish"),
      text: t(locale, "step_publish_text"),
    },
    {
      title: t(locale, "step_match"),
      text: t(locale, "step_match_text"),
    },
    {
      title: t(locale, "step_trust"),
      text: t(locale, "step_trust_text"),
    },
  ];

  return (
    <main>
      <section className="relative min-h-[78vh] overflow-hidden">
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
              "linear-gradient(105deg, rgba(11,61,46,0.92) 0%, rgba(11,61,46,0.78) 42%, rgba(26,92,69,0.55) 70%, rgba(26,92,69,0.35) 100%)",
          }}
        />
        <div className="relative mx-auto flex min-h-[78vh] max-w-6xl flex-col justify-end gap-8 px-6 pb-16 pt-24 text-white md:justify-center md:pb-20 md:pt-16">
          <div className="md:max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/75">
              RapidFacto
            </p>
            <h1 className="mt-4 font-[family-name:var(--font-display)] text-5xl leading-[1.05] font-semibold md:text-6xl">
              Rfacto
            </h1>
            <p className="mt-6 max-w-xl text-lg text-white/90 md:text-xl">
              {t(locale, "hero_tagline")}
            </p>
            <p className="mt-3 max-w-xl text-sm text-white/75">
              {t(locale, "hero_sub")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register?role=SENDER">
                <Button
                  size="lg"
                  className="bg-white text-[var(--hero-from)] hover:bg-white/90"
                >
                  {t(locale, "cta_send")}
                </Button>
              </Link>
              <Link href="/register?role=TRAVELER">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/40 bg-transparent text-white hover:bg-white/10"
                >
                  {t(locale, "cta_travel")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          {t(locale, "section_airbnb_title")}
        </h2>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">
          {t(locale, "section_airbnb_text")}
        </p>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {steps.map((item) => (
            <div key={item.title}>
              <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
          {t(locale, "dual_role_title")}
        </h2>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">
          {t(locale, "dual_role_text")}
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] px-8 py-10">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            {t(locale, "phase1_title")}
          </h2>
          <p className="mt-2 text-[var(--muted)]">{t(locale, "phase1_text")}</p>
          <p className="mt-4 text-sm text-[var(--muted)]">
            {t(locale, "phase1_examples")}
          </p>
          <div className="mt-6">
            <Link href="/register">
              <Button>{t(locale, "join_rfacto")}</Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
