import type { Metadata } from "next";
import Link from "next/link";
import { getRequestLocale } from "@/lib/locale";
import { t, type DictKey } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Charte des publications",
  description:
    "Règles de publication communautaire Rfacto — crédibilité, sécurité, croissance.",
};

export default async function PublicationCharterPage() {
  const locale = await getRequestLocale();

  const articles: Array<[DictKey, DictKey]> = [
    ["pub_charter_a1_title", "pub_charter_a1_text"],
    ["pub_charter_a2_title", "pub_charter_a2_text"],
    ["pub_charter_a3_title", "pub_charter_a3_text"],
    ["pub_charter_a4_title", "pub_charter_a4_text"],
    ["pub_charter_a5_title", "pub_charter_a5_text"],
    ["pub_charter_a6_title", "pub_charter_a6_text"],
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-12">
      <div>
        <p className="text-sm font-medium text-[var(--accent)]">Rfacto</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--accent)]">
          {t(locale, "pub_charter_title")}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
          {t(locale, "pub_charter_lead")}
        </p>
      </div>

      <div className="space-y-6">
        {articles.map(([titleKey, textKey]) => (
          <section key={titleKey} className="space-y-2">
            <h2 className="text-lg font-semibold">{t(locale, titleKey)}</h2>
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              {t(locale, textKey)}
            </p>
          </section>
        ))}
      </div>

      <p className="text-sm text-[var(--muted)]">{t(locale, "pub_charter_footer")}</p>

      <Link
        href="/profile"
        className="inline-flex text-sm font-medium text-[var(--accent)] hover:underline"
      >
        ← {t(locale, "profile_title")}
      </Link>
    </div>
  );
}
