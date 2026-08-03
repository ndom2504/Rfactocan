import Link from "next/link";
import type { Metadata } from "next";
import { getRequestLocale } from "@/lib/locale";
import { t, type DictKey } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Normes de sécurité des enfants | Rfacto",
  description:
    "Normes Rfacto / RapidFacto contre l'exploitation d'enfants et les abus sexuels sur mineurs (CSAE / CSAM) — standards publics pour l'application mobile et le site.",
  alternates: { canonical: "/child-safety" },
  robots: { index: true, follow: true },
};

const SECTIONS: { title: DictKey; text: DictKey }[] = [
  { title: "child_safety_s1_title", text: "child_safety_s1_text" },
  { title: "child_safety_s2_title", text: "child_safety_s2_text" },
  { title: "child_safety_s3_title", text: "child_safety_s3_text" },
  { title: "child_safety_s4_title", text: "child_safety_s4_text" },
  { title: "child_safety_s5_title", text: "child_safety_s5_text" },
  { title: "child_safety_s6_title", text: "child_safety_s6_text" },
  { title: "child_safety_s7_title", text: "child_safety_s7_text" },
  { title: "child_safety_s8_title", text: "child_safety_s8_text" },
  { title: "child_safety_s9_title", text: "child_safety_s9_text" },
];

export default async function ChildSafetyPage() {
  const locale = await getRequestLocale();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-sm font-medium uppercase tracking-[0.15em] text-[var(--muted)]">
        RapidFacto · Rfacto
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold">
        {t(locale, "child_safety_title")}
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {t(locale, "child_safety_updated")}
      </p>
      <p className="mt-4 text-lg leading-relaxed text-[var(--muted)]">
        {t(locale, "child_safety_lead")}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
        {t(locale, "child_safety_scope")}
      </p>

      {SECTIONS.map((s) => (
        <section key={s.title} className="mt-10 space-y-3">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            {t(locale, s.title)}
          </h2>
          <p className="leading-relaxed text-[var(--muted)] whitespace-pre-line">
            {t(locale, s.text)}
          </p>
        </section>
      ))}

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/privacy">
          <Button variant="outline">{t(locale, "nav_privacy")}</Button>
        </Link>
        <Link href="/trust">
          <Button variant="outline">{t(locale, "trust_program_cta")}</Button>
        </Link>
        <Link href="/">
          <Button variant="outline">{t(locale, "back_home")}</Button>
        </Link>
      </div>
    </main>
  );
}
