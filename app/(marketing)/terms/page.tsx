import Link from "next/link";
import type { Metadata } from "next";
import { getRequestLocale } from "@/lib/locale";
import { t, type DictKey } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "CGU & mentions légales | Rfacto",
  description:
    "Conditions d’utilisation, mentions légales et propriété intellectuelle RapidFacto / Rfacto.",
  alternates: { canonical: "/terms" },
};

const SECTIONS: { title: DictKey; text: DictKey }[] = [
  { title: "terms_s1_title", text: "terms_s1_text" },
  { title: "terms_s2_title", text: "terms_s2_text" },
  { title: "terms_s3_title", text: "terms_s3_text" },
  { title: "terms_s4_title", text: "terms_s4_text" },
  { title: "terms_s5_title", text: "terms_s5_text" },
  { title: "terms_s6_title", text: "terms_s6_text" },
  { title: "terms_s7_title", text: "terms_s7_text" },
  { title: "terms_s8_title", text: "terms_s8_text" },
  { title: "terms_s9_title", text: "terms_s9_text" },
  { title: "terms_s10_title", text: "terms_s10_text" },
  { title: "terms_s11_title", text: "terms_s11_text" },
  { title: "terms_s12_title", text: "terms_s12_text" },
  { title: "terms_s13_title", text: "terms_s13_text" },
  { title: "terms_s14_title", text: "terms_s14_text" },
];

export default async function TermsPage() {
  const locale = await getRequestLocale();
  const year = new Date().getFullYear();
  const copyright = t(locale, "copyright_line").replace("{year}", String(year));

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-sm font-medium uppercase tracking-[0.15em] text-[var(--muted)]">
        RapidFacto
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold">
        {t(locale, "terms_title")}
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {t(locale, "terms_updated")}
      </p>
      <p className="mt-4 text-lg leading-relaxed text-[var(--muted)]">
        {t(locale, "terms_lead")}
      </p>

      <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 p-4">
        <p className="text-sm font-semibold text-[var(--foreground)]">{copyright}</p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          {t(locale, "copyright_ip_note")}
        </p>
      </div>

      {SECTIONS.map((s) => (
        <section key={s.title} className="mt-10 space-y-3">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            {t(locale, s.title)}
          </h2>
          <p className="leading-relaxed text-[var(--muted)]">{t(locale, s.text)}</p>
        </section>
      ))}

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/privacy">
          <Button variant="outline">{t(locale, "nav_privacy")}</Button>
        </Link>
        <Link href="/responsibility">
          <Button variant="outline">{t(locale, "nav_responsibility")}</Button>
        </Link>
        <Link href="/">
          <Button variant="outline">{t(locale, "back_home")}</Button>
        </Link>
      </div>
    </main>
  );
}
