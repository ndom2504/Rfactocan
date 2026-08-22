"use client";

import Image from "next/image";
import { ProfileMenu } from "@/components/profile-menu";
import { useI18n } from "@/components/locale-provider";
import { RFACTO_SLIDES, rfactoSlideSrc } from "@/lib/rfacto-slides";

type Props = {
  displayName: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  kycVerified?: boolean;
};

export function DashboardWelcomeBanner({
  displayName,
  avatarUrl,
  bannerUrl,
  kycVerified,
}: Props) {
  const { locale, t } = useI18n();
  const customBanner = Boolean(bannerUrl);

  return (
    <section
      data-tour="welcome"
      className="relative z-20 w-full border-b border-[var(--border)] bg-[var(--surface)]"
    >
      <div className="relative overflow-hidden bg-[var(--rfacto-green-dark)]">
        {customBanner ? (
          <div className="relative h-40 w-full sm:h-48 md:h-[min(42vw,420px)] lg:h-[min(38vw,480px)]">
            {/* eslint-disable-next-line @next/next/no-img-element -- user uploads /api/media URLs */}
            <img
              src={bannerUrl!}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          </div>
        ) : (
          <Image
            key={locale}
            src={rfactoSlideSrc(RFACTO_SLIDES[0]!, locale)}
            alt={t("home_slide_communaute_alt")}
            width={1024}
            height={576}
            priority
            sizes="100vw"
            className="h-auto w-full"
          />
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[var(--surface)] to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--rfacto-gold)] to-transparent opacity-90" />
      </div>

      <div className="relative z-30 mx-auto flex max-w-6xl flex-col items-center px-6 pb-6 pt-0 text-center">
        <div className="relative z-30 -mt-14 sm:-mt-16" data-tour="profile-menu">
          <ProfileMenu
            displayName={displayName}
            avatarUrl={avatarUrl}
            size="lg"
            showName={false}
          />
        </div>

        <h1 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--rfacto-green)] sm:text-3xl">
          {t("hello")}, {displayName}
        </h1>
        {kycVerified ? (
          <p className="mt-1 text-xs font-medium text-[var(--rfacto-green-light)]">
            {t("verified")}
          </p>
        ) : null}
        <p className="mx-auto mt-2 max-w-xl text-sm text-[var(--muted)] sm:text-base">
          {t("dashboard_subtitle")}
        </p>
        <p className="mx-auto mt-1 max-w-xl text-xs text-[var(--muted)] sm:text-sm">
          {t("dashboard_actors_hint")}
        </p>
      </div>
    </section>
  );
}
