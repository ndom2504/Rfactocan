import Link from "next/link";
import { getRequestLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export default async function ResponsibilityPage() {
  const locale = await getRequestLocale();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-sm font-medium uppercase tracking-[0.15em] text-[var(--muted)]">
        RapidFacto
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold">
        {t(locale, "liability_page_title")}
      </h1>
      <p className="mt-4 text-lg text-[var(--muted)]">
        {t(locale, "liability_page_lead")}
      </p>

      <section className="mt-10 space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
          {t(locale, "liability_analogy_title")}
        </h2>
        <p className="leading-relaxed text-[var(--muted)]">
          {t(locale, "liability_analogy_text")}
        </p>
      </section>

      <section className="mt-10 grid gap-6 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
            {t(locale, "liability_we_do")}
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--muted)]">
            <li>{t(locale, "liability_we_do_1")}</li>
            <li>{t(locale, "liability_we_do_2")}</li>
            <li>{t(locale, "liability_we_do_3")}</li>
            <li>{t(locale, "liability_page_we_do_4")}</li>
          </ul>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-xs font-semibold uppercase tracking-wide">
            {t(locale, "liability_you_do")}
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--muted)]">
            <li>{t(locale, "liability_you_do_1")}</li>
            <li>{t(locale, "liability_you_do_2")}</li>
            <li>{t(locale, "liability_you_do_3")}</li>
            <li>{t(locale, "liability_page_you_do_4")}</li>
          </ul>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-800">
            {t(locale, "liability_we_dont")}
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--muted)]">
            <li>{t(locale, "liability_we_dont_1")}</li>
            <li>{t(locale, "liability_we_dont_2")}</li>
            <li>{t(locale, "liability_we_dont_3")}</li>
            <li>{t(locale, "liability_page_we_dont_4")}</li>
          </ul>
        </div>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
          {t(locale, "liability_safety_title")}
        </h2>
        <p className="leading-relaxed text-[var(--muted)]">
          {t(locale, "liability_safety_text")}
        </p>
      </section>

      <section className="mt-10 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          {t(locale, "liability_remember_title")}
        </h2>
        <p className="mt-2 leading-relaxed text-[var(--muted)]">
          {t(locale, "liability_remember_text")}
        </p>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/register">
          <Button>{t(locale, "join_rfacto")}</Button>
        </Link>
        <Link href="/">
          <Button variant="outline">{t(locale, "back_home")}</Button>
        </Link>
      </div>
    </main>
  );
}
