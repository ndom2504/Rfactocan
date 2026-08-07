import Link from "next/link";
import type { Metadata } from "next";
import { getRequestLocale } from "@/lib/locale";
import { t, type DictKey } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Politique de confidentialité | Rfacto",
  description:
    "Politique de confidentialité RapidFacto / Rfacto — données personnelles, paiements, KYC et application mobile.",
  alternates: { canonical: "/privacy" },
};

const SECTIONS: { title: DictKey; text: DictKey }[] = [
  { title: "privacy_s1_title", text: "privacy_s1_text" },
  { title: "privacy_s2_title", text: "privacy_s2_text" },
  { title: "privacy_s3_title", text: "privacy_s3_text" },
  { title: "privacy_s4_title", text: "privacy_s4_text" },
  { title: "privacy_s5_title", text: "privacy_s5_text" },
  { title: "privacy_s6_title", text: "privacy_s6_text" },
  { title: "privacy_s7_title", text: "privacy_s7_text" },
  { title: "privacy_s8_title", text: "privacy_s8_text" },
  { title: "privacy_s9_title", text: "privacy_s9_text" },
  { title: "privacy_s10_title", text: "privacy_s10_text" },
  { title: "privacy_s11_title", text: "privacy_s11_text" },
  { title: "privacy_s12_title", text: "privacy_s12_text" },
  { title: "privacy_s13_title", text: "privacy_s13_text" },
];

export default async function PrivacyPage() {
  const locale = await getRequestLocale();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-sm font-medium uppercase tracking-[0.15em] text-[var(--muted)]">
        RapidFacto
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold">
        {t(locale, "privacy_title")}
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {t(locale, "privacy_updated")}
      </p>
      <p className="mt-4 text-lg leading-relaxed text-[var(--muted)]">
        {t(locale, "privacy_lead")}
      </p>

      {SECTIONS.map((s) => (
        <section key={s.title} className="mt-10 space-y-3">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            {t(locale, s.title)}
          </h2>
          <p className="leading-relaxed text-[var(--muted)]">
            {t(locale, s.text)}
          </p>
        </section>
      ))}

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/terms">
          <Button variant="outline">{t(locale, "nav_terms")}</Button>
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
