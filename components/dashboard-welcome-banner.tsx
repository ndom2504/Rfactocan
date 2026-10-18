"use client";

import { Building2, CheckCircle2, Plane, Users } from "lucide-react";
import { ProfileMenu } from "@/components/profile-menu";
import { useI18n } from "@/components/locale-provider";

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
  const { t } = useI18n();
  const customBanner = Boolean(bannerUrl);

  const actors = [
    { icon: Plane, label: t("dashboard_actor_traveler") },
    { icon: Building2, label: t("dashboard_actor_commercial") },
    { icon: Users, label: t("dashboard_actor_client") },
  ];

  return (
    <section
      data-tour="welcome"
      className="relative overflow-hidden border-b border-[var(--border)] bg-gradient-to-b from-[#e8f3fb] via-white to-white"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#d62828] via-[var(--rfacto-green)] to-[#0b5cab]"
        aria-hidden
      />
      {customBanner ? (
        <div className="relative h-24 w-full overflow-hidden sm:h-32">
          {/* eslint-disable-next-line @next/next/no-img-element -- user uploads /api/media URLs */}
          <img
            src={bannerUrl!}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white" />
        </div>
      ) : (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_80%_0%,rgba(11,92,171,0.18),transparent_55%),radial-gradient(ellipse_at_10%_20%,rgba(40,84,29,0.08),transparent_45%)]"
          aria-hidden
        />
      )}

      <div className="relative z-10 mx-auto max-w-5xl px-6 pb-10 pt-8 text-center sm:pt-10">
        <div className="flex justify-center" data-tour="profile-menu">
          <ProfileMenu
            displayName={displayName}
            avatarUrl={avatarUrl}
            size="lg"
            showName={false}
          />
        </div>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[#0b3d8c] sm:text-4xl">
          {t("hello")}, {displayName}
        </h1>
        {kycVerified ? (
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--rfacto-green)]">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            {t("verified")}
          </p>
        ) : null}
        <p className="mx-auto mt-3 max-w-2xl text-sm text-[#4b5568] sm:text-base">
          {t("dashboard_subtitle")}
        </p>

        <div className="mx-auto mt-6 flex max-w-3xl flex-col items-center justify-center gap-3 text-sm text-[#1f3b6d] sm:flex-row sm:gap-8">
          {actors.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="inline-flex items-center gap-2 font-medium"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0b3d8c]/8 text-[#0b3d8c]">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              {label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
