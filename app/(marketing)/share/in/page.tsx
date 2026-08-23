import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getAppUrl } from "@/lib/app-url";
import { getRequestLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

type Props = { searchParams: Promise<{ ref?: string }> };

const OG_TITLE = "Rfacto + In — bâtissez votre réseau d’affaires";
const OG_DESC =
  "Inscris-toi sur Rfacto et rejoins In pour bâtir des relations et un réseau pro business.";

export async function generateMetadata(): Promise<Metadata> {
  const url = `${getAppUrl()}/share/in`;
  return {
    title: OG_TITLE,
    description: OG_DESC,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      siteName: "Rfacto",
      title: OG_TITLE,
      description: OG_DESC,
      locale: "fr_FR",
    },
    twitter: {
      card: "summary_large_image",
      title: OG_TITLE,
      description: OG_DESC,
    },
  };
}

export default async function InSharePage({ searchParams }: Props) {
  const locale = await getRequestLocale();
  const { ref } = await searchParams;
  const code = ref?.trim().toUpperCase() || "";
  const registerHref = code
    ? `/register?ref=${encodeURIComponent(code)}`
    : "/register";

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <p className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-wide text-[#D4AF37]">
        Rfacto + In
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold text-[#10241F]">
        {t(locale, "in_share_page_title")}
      </h1>
      <p className="mt-3 text-[var(--muted)]">{t(locale, "in_share_page_lead")}</p>
      <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-[#10241F]">
        <Image
          src="/in/rfacto-in-ad.png"
          alt={t(locale, "in_share_page_title")}
          width={1024}
          height={1024}
          className="h-auto w-full"
          priority
        />
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={registerHref}>
          <Button>{t(locale, "in_share_page_cta")}</Button>
        </Link>
        <Link href="/login">
          <Button variant="outline">{t(locale, "sign_in")}</Button>
        </Link>
      </div>
    </main>
  );
}
