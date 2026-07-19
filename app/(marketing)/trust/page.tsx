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
