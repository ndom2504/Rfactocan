import Link from "next/link";
import type { Metadata } from "next";
import { getRequestLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Suppression de compte | Rfacto",
  description:
    "Demander la suppression de votre compte et de vos données personnelles Rfacto / RapidFacto.",
  alternates: { canonical: "/delete-account" },
};

export default async function DeleteAccountPage() {
  const locale = await getRequestLocale();
  const isEn = locale === "en";

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-sm font-medium uppercase tracking-[0.15em] text-[var(--muted)]">
        RapidFacto
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold">
        {t(locale, "delete_account_title")}
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-[var(--muted)]">
        {t(locale, "delete_account_lead")}
      </p>

      <section className="mt-10 space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
          {t(locale, "delete_account_how_title")}
        </h2>
        <ol className="list-decimal space-y-3 pl-5 leading-relaxed text-[var(--muted)]">
          <li>{t(locale, "delete_account_how_1")}</li>
          <li>{t(locale, "delete_account_how_2")}</li>
          <li>{t(locale, "delete_account_how_3")}</li>
        </ol>
      </section>

      <section className="mt-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          {t(locale, "delete_account_email_title")}
        </h2>
        <p className="mt-2 text-[var(--muted)]">
          {t(locale, "delete_account_email_text")}
        </p>
        <a
          href={`mailto:contact@rfacto.com?subject=${encodeURIComponent(
            isEn
              ? "Rfacto account deletion request"
              : "Demande de suppression de compte Rfacto"
          )}`}
          className="mt-4 inline-block text-base font-semibold text-[var(--accent)] underline"
        >
          contact@rfacto.com
        </a>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
          {t(locale, "delete_account_what_title")}
        </h2>
        <p className="leading-relaxed text-[var(--muted)]">
          {t(locale, "delete_account_what_text")}
        </p>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
          {t(locale, "delete_account_delay_title")}
        </h2>
        <p className="leading-relaxed text-[var(--muted)]">
          {t(locale, "delete_account_delay_text")}
        </p>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/privacy">
          <Button variant="outline">{t(locale, "nav_privacy")}</Button>
        </Link>
        <Link href="/">
          <Button variant="outline">{t(locale, "back_home")}</Button>
        </Link>
      </div>
    </main>
  );
}
