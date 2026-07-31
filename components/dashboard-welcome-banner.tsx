"use client";

import Image from "next/image";
import { ProfileMenu } from "@/components/profile-menu";
import { useI18n } from "@/components/locale-provider";

type Props = {
  displayName: string;
  avatarUrl?: string | null;
  kycVerified?: boolean;
};

export function DashboardWelcomeBanner({
  displayName,
  avatarUrl,
  kycVerified,
}: Props) {
  const { t } = useI18n();

  return (
    <section data-tour="welcome" className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <div className="relative h-36 w-full sm:h-44">
        <Image
          src="/images/home/slide-boutique.png"
          alt=""
          fill
          priority
          sizes="(max-width: 768px) 100vw, 1152px"
          className="object-cover object-center"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(160deg, rgba(27,59,20,0.55) 0%, rgba(40,84,29,0.35) 50%, rgba(64,77,53,0.55) 100%)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[var(--surface)] to-transparent" />
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[var(--rfacto-gold)] to-transparent opacity-90" />
      </div>

      <div className="relative flex flex-col items-center px-5 pb-6 pt-0 text-center sm:px-8">
        <div
          className="-mt-14 sm:-mt-16"
          data-tour="profile-menu"
        >
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
