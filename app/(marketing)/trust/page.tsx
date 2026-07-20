import Link from "next/link";
import { getRequestLocale } from "@/lib/locale";
import { t, type DictKey } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Status = "live" | "partial" | "soon";

type Item = {
  titleKey: DictKey;
  textKey: DictKey;
  status: Status;
};

type Section = {
  titleKey: DictKey;
  leadKey: DictKey;
  items: Item[];
};

const CHARTER_ARTICLES: { titleKey: DictKey; textKey: DictKey }[] = [
  { titleKey: "trust_charter_a1_title", textKey: "trust_charter_a1_text" },
  { titleKey: "trust_charter_a2_title", textKey: "trust_charter_a2_text" },
  { titleKey: "trust_charter_a3_title", textKey: "trust_charter_a3_text" },
  { titleKey: "trust_charter_a4_title", textKey: "trust_charter_a4_text" },
  { titleKey: "trust_charter_a5_title", textKey: "trust_charter_a5_text" },
  { titleKey: "trust_charter_a6_title", textKey: "trust_charter_a6_text" },
  { titleKey: "trust_charter_a7_title", textKey: "trust_charter_a7_text" },
];

const FUNDS_ITEMS: Item[] = [
  {
    titleKey: "trust_funds_i1_title",
    textKey: "trust_funds_i1_text",
    status: "soon",
  },
  {
    titleKey: "trust_funds_i2_title",
    textKey: "trust_funds_i2_text",
    status: "live",
  },
  {
    titleKey: "trust_funds_i3_title",
    textKey: "trust_funds_i3_text",
    status: "live",
  },
  {
    titleKey: "trust_funds_i4_title",
    textKey: "trust_funds_i4_text",
    status: "soon",
  },
];

const SECTIONS: Section[] = [
  {
    titleKey: "trust_s1_title",
    leadKey: "trust_s1_lead",
    items: [
      {
        titleKey: "trust_s1_i1_title",
        textKey: "trust_s1_i1_text",
        status: "soon",
      },
      {
        titleKey: "trust_s1_i2_title",
        textKey: "trust_s1_i2_text",
        status: "soon",
      },
      {
        titleKey: "trust_s1_i3_title",
        textKey: "trust_s1_i3_text",
        status: "soon",
      },
    ],
  },
  {
    titleKey: "trust_s2_title",
    leadKey: "trust_s2_lead",
    items: [
      {
        titleKey: "trust_s2_i1_title",
        textKey: "trust_s2_i1_text",
        status: "live",
      },
      {
        titleKey: "trust_s2_i2_title",
        textKey: "trust_s2_i2_text",
        status: "live",
      },
      {
        titleKey: "trust_s2_i3_title",
        textKey: "trust_s2_i3_text",
        status: "live",
      },
    ],
  },
  {
    titleKey: "trust_s3_title",
    leadKey: "trust_s3_lead",
    items: [
      {
        titleKey: "trust_s3_i1_title",
        textKey: "trust_s3_i1_text",
        status: "live",
      },
      {
        titleKey: "trust_s3_i2_title",
        textKey: "trust_s3_i2_text",
        status: "live",
      },
      {
        titleKey: "trust_s3_i3_title",
        textKey: "trust_s3_i3_text",
        status: "partial",
      },
    ],
  },
  {
    titleKey: "trust_s4_title",
    leadKey: "trust_s4_lead",
    items: [
      {
        titleKey: "trust_s4_i1_title",
        textKey: "trust_s4_i1_text",
        status: "partial",
      },
      {
        titleKey: "trust_s4_i2_title",
        textKey: "trust_s4_i2_text",
        status: "partial",
      },
      {
        titleKey: "trust_s4_i3_title",
        textKey: "trust_s4_i3_text",
        status: "live",
      },
    ],
  },
];

function statusLabel(locale: "fr" | "en", status: Status) {
  if (status === "live") return t(locale, "trust_status_live");
  if (status === "partial") return t(locale, "trust_status_partial");
  return t(locale, "trust_status_soon");
}

function statusClass(status: Status) {
  if (status === "live") {
    return "bg-[var(--accent-soft)] text-[var(--accent)]";
  }
  if (status === "partial") {
    return "bg-[var(--surface-2)] text-[var(--foreground)]";
  }
  return "bg-[var(--surface-2)] text-[var(--muted)]";
}

export default async function TrustProgramPage() {
  const locale = await getRequestLocale();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-sm font-medium uppercase tracking-[0.15em] text-[var(--muted)]">
        Rfacto
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold">
        {t(locale, "trust_program_title")}
      </h1>
      <p className="mt-4 text-lg text-[var(--muted)]">
        {t(locale, "trust_program_lead")}
      </p>

      <div className="mt-8 space-y-8">
        {SECTIONS.map((section) => (
          <section
            key={section.titleKey}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6"
          >
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
              {t(locale, section.titleKey)}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              {t(locale, section.leadKey)}
            </p>
            <ul className="mt-5 space-y-4">
              {section.items.map((item) => (
                <li key={item.titleKey} className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-[var(--foreground)]">
                      {t(locale, item.titleKey)}
                    </p>
                    <Badge className={statusClass(item.status)}>
                      {statusLabel(locale, item.status)}
                    </Badge>
                  </div>
                  <p className="text-sm leading-relaxed text-[var(--muted)]">
                    {t(locale, item.textKey)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section
        id="charte"
        className="mt-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6"
      >
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
          {t(locale, "trust_charter_title")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          {t(locale, "trust_charter_lead")}
        </p>
        <ol className="mt-6 space-y-5">
          {CHARTER_ARTICLES.map((article) => (
            <li key={article.titleKey} className="space-y-1.5">
              <p className="font-medium text-[var(--foreground)]">
                {t(locale, article.titleKey)}
              </p>
              <p className="text-sm leading-relaxed text-[var(--muted)]">
                {t(locale, article.textKey)}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section
        id="incidents-fonds"
        className="mt-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6"
      >
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
          {t(locale, "trust_funds_title")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          {t(locale, "trust_funds_lead")}
        </p>
        <ul className="mt-5 space-y-4">
          {FUNDS_ITEMS.map((item) => (
            <li key={item.titleKey} className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-[var(--foreground)]">
                  {t(locale, item.titleKey)}
                </p>
                <Badge className={statusClass(item.status)}>
                  {statusLabel(locale, item.status)}
                </Badge>
              </div>
              <p className="text-sm leading-relaxed text-[var(--muted)]">
                {t(locale, item.textKey)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-8 text-sm text-[var(--muted)]">
        {t(locale, "trust_program_footnote")}
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/responsibility">
          <Button variant="outline">
            {t(locale, "trust_program_liability_link")}
          </Button>
        </Link>
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
