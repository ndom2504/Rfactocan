import Link from "next/link";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { t, type Locale } from "@/lib/i18n";

type Props = {
  locale: Locale;
  compact?: boolean;
};

export function ResponsibilityNotice({ locale, compact }: Props) {
  if (compact) {
    return (
      <p className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--muted)]">
        {t(locale, "liability_compact")}{" "}
        <Link
          href="/responsibility"
          className="font-medium text-[var(--accent)] underline"
        >
          {t(locale, "liability_learn_more")}
        </Link>
      </p>
    );
  }

  return (
    <Card>
      <CardTitle className="text-lg">{t(locale, "liability_title")}</CardTitle>
      <CardDescription className="mt-1">
        {t(locale, "liability_intro")}
      </CardDescription>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
            {t(locale, "liability_we_do")}
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-[var(--muted)]">
            <li>· {t(locale, "liability_we_do_1")}</li>
            <li>· {t(locale, "liability_we_do_2")}</li>
            <li>· {t(locale, "liability_we_do_3")}</li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]">
            {t(locale, "liability_you_do")}
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-[var(--muted)]">
            <li>· {t(locale, "liability_you_do_1")}</li>
            <li>· {t(locale, "liability_you_do_2")}</li>
            <li>· {t(locale, "liability_you_do_3")}</li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-red-800">
            {t(locale, "liability_we_dont")}
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-[var(--muted)]">
            <li>· {t(locale, "liability_we_dont_1")}</li>
            <li>· {t(locale, "liability_we_dont_2")}</li>
            <li>· {t(locale, "liability_we_dont_3")}</li>
          </ul>
        </div>
      </div>
      <p className="mt-4 text-sm">
        <Link
          href="/responsibility"
          className="font-medium text-[var(--accent)] underline"
        >
          {t(locale, "liability_learn_more")}
        </Link>
      </p>
    </Card>
  );
}
