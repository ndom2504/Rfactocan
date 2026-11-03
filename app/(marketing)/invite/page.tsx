import type { Metadata } from "next";
import Link from "next/link";
import { getAppUrl } from "@/lib/app-url";
import { getRequestLocale } from "@/lib/locale";
import { prisma } from "@/lib/prisma";
import { t } from "@/lib/i18n";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = { searchParams: Promise<{ u?: string }> };

const PLAY =
  "https://play.google.com/store/apps/details?id=com.rfacto.app";
const APP_STORE =
  "https://apps.apple.com/ca/app/rfacto/id6805710784?l=fr-CA";

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const { u } = await searchParams;
  const url = `${getAppUrl()}/invite${u ? `?u=${encodeURIComponent(u)}` : ""}`;
  return {
    title: "Rejoins-moi sur Rfacto",
    description:
      "Télécharge Rfacto et connecte-toi avec moi pour échanger, collaborer et grandir ensemble.",
    alternates: { canonical: url },
  };
}

export default async function InvitePage({ searchParams }: Props) {
  const locale = await getRequestLocale();
  const { u } = await searchParams;
  const inviterId = u?.trim() || "";
  let inviterName = "";
  if (inviterId.length >= 8) {
    const user = await prisma.user.findUnique({
      where: { id: inviterId },
      select: { displayName: true },
    });
    if (user) {
      inviterName = user.displayName?.trim() || "";
    }
  }

  const registerHref = inviterId
    ? `/register?invite=${encodeURIComponent(inviterId)}`
    : "/register";
  const title = inviterName
    ? `${inviterName} t’invite sur Rfacto`
    : "Rejoins Rfacto";

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <p className="text-sm font-semibold tracking-wide text-[#D4AF37]">
        Rfacto
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-[#10241F]">{title}</h1>
      <p className="mt-3 text-[var(--muted)]">
        Télécharge l’app, crée ton compte — vous serez automatiquement connectés.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        <a href={PLAY} className={cn(buttonVariants(), "w-full")}>
          Télécharger sur Android (Play Store)
        </a>
        <a
          href={APP_STORE}
          className={cn(buttonVariants({ variant: "outline" }), "w-full")}
        >
          Télécharger sur iPhone (App Store)
        </a>
        <Link
          href={registerHref}
          className={cn(buttonVariants({ variant: "outline" }), "w-full")}
        >
          {t(locale, "create_account") || "Créer un compte sur le web"}
        </Link>
        <Link
          href="/login"
          className={cn(buttonVariants({ variant: "ghost" }), "w-full")}
        >
          {t(locale, "sign_in")}
        </Link>
      </div>
    </main>
  );
}
