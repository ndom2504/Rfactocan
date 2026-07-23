import Link from "next/link";
import { getRequestLocale } from "@/lib/locale";
import { t, type DictKey } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

const SECTIONS: { titleKey: DictKey; textKey: DictKey; listKeys?: DictKey[] }[] =
  [
    {
      titleKey: "about_welcome_title",
      textKey: "about_welcome_text",
    },
    {
      titleKey: "about_vision_title",
      textKey: "about_vision_text",
    },
    {
      titleKey: "about_objectives_title",
      textKey: "about_objectives_text",
      listKeys: [
        "about_obj_1",
        "about_obj_2",
        "about_obj_3",
        "about_obj_4",
      ],
    },
    {
      titleKey: "about_values_title",
      textKey: "about_values_text",
    },
    {
      titleKey: "about_trust_title",
      textKey: "about_trust_text",
    },
    {
      titleKey: "about_org_title",
      textKey: "about_org_text",
    },
    {
      titleKey: "about_ambassadors_title",
      textKey: "about_ambassadors_text",
    },
    {
      titleKey: "about_community_title",
      textKey: "about_community_text",
    },
    {
      titleKey: "about_security_title",
      textKey: "about_security_text",
      listKeys: ["about_features_live", "about_features_soon"],
    },
  ];

export default async function AboutPage() {
  const locale = await getRequestLocale();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
        RapidFacto
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-semibold text-[var(--accent)] md:text-5xl">
        {t(locale, "about_title")}
      </h1>

      <div className="mt-10 space-y-10">
        {SECTIONS.map((section) => (
          <section key={section.titleKey} className="space-y-3">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
              {t(locale, section.titleKey)}
            </h2>
            <p className="text-sm leading-relaxed text-[var(--muted)] md:text-base">
              {t(locale, section.textKey)}
            </p>
            {section.listKeys ? (
              <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--foreground)]">
                {section.listKeys.map((key) => (
                  <li key={key}>{t(locale, key)}</li>
                ))}
              </ul>
            ) : null}
            {section.titleKey === "about_trust_title" ? (
              <Link href="/trust" className="inline-block pt-1">
                <Button variant="outline">{t(locale, "about_trust_cta")}</Button>
              </Link>
            ) : null}
          </section>
        ))}
      </div>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link href="/register">
          <Button>{t(locale, "join_rfacto")}</Button>
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
