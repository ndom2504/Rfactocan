import Image from "next/image";
import type { ReactNode } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Package,
  Smartphone,
} from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

type Props = {
  locale: Locale;
  iosUrl: string;
  androidUrl: string;
};

function PhoneShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[1.7rem] border-[5px] border-white bg-[#0b2548] shadow-[0_18px_40px_rgba(11,61,140,0.28)] ${className}`}
    >
      <div className="absolute inset-x-[28%] top-1.5 z-10 h-1.5 rounded-full bg-black/35" />
      {children}
    </div>
  );
}

function StorePhone({
  tone,
  tagline,
}: {
  tone: "ios" | "android";
  tagline: string;
}) {
  const overlay =
    tone === "ios"
      ? "from-[#0b4db8]/70 via-[#0b3d8c]/35 to-transparent"
      : "from-[#15803d]/70 via-[#16a34a]/30 to-transparent";
  const lines = tagline.split(". ").map((part) => part.replace(/\.$/, ""));

  return (
    <PhoneShell className="hidden h-[230px] w-[118px] shrink-0 sm:block md:h-[250px] md:w-[128px]">
      <Image
        src="/images/home/slide-communaute.png"
        alt=""
        fill
        className="object-cover"
        sizes="128px"
      />
      <div className={`absolute inset-0 bg-gradient-to-t ${overlay}`} />
      <div className="absolute inset-0 flex flex-col items-center px-3 pt-8 text-center text-white">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-md">
          <Image
            src="/logo-rfacto.webp"
            alt="Rfacto"
            width={36}
            height={36}
            className="h-8 w-8 object-contain"
          />
        </div>
        <p className="mt-2 text-lg font-bold tracking-tight">Rfacto</p>
        <p className="mt-1 text-[10px] font-medium leading-tight text-white/90">
          {lines.map((line) => (
            <span key={line} className="block">
              {line}.
            </span>
          ))}
        </p>
      </div>
    </PhoneShell>
  );
}

function PreviewPhoneTrack({ locale }: { locale: Locale }) {
  return (
    <PhoneShell className="h-[210px] w-[108px] bg-white sm:h-[230px] sm:w-[118px]">
      <div className="h-full bg-[#f3f7fb] px-2 pt-5 text-[8px] text-[#1f3b6d]">
        <p className="font-semibold">{t(locale, "dashboard_preview_track")}</p>
        <p className="mt-1 font-bold text-[#0b3d8c]">RF2026-4587</p>
        <p className="mt-0.5 text-[7px] text-emerald-600">
          {t(locale, "dashboard_preview_in_delivery")}
        </p>
        <div className="mt-2 space-y-1.5">
          {(
            [
              "dash_preview_step_shipped",
              "dash_preview_step_transit",
              "dash_preview_step_delivery",
            ] as const
          ).map((key) => (
            <div
              key={key}
              className="rounded-md bg-white px-1.5 py-1 shadow-sm"
            >
              <p className="text-[7px] font-semibold leading-tight">
                {t(locale, key)}
              </p>
              <div className="mt-1 h-1 w-full rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    </PhoneShell>
  );
}

function PreviewPhoneHome({ tagline }: { tagline: string }) {
  const lines = tagline.split(". ").map((part) => part.replace(/\.$/, ""));
  return (
    <PhoneShell className="-mt-4 h-[230px] w-[118px] sm:h-[250px] sm:w-[128px]">
      <div className="flex h-full flex-col bg-gradient-to-b from-[#0b4db8] to-[#0b3d8c] px-3 pt-8 text-center text-white">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-white">
          <Image
            src="/logo-rfacto.webp"
            alt=""
            width={32}
            height={32}
            className="h-7 w-7 object-contain"
          />
        </div>
        <p className="mt-2 text-base font-bold">Rfacto</p>
        <p className="mt-1 text-[10px] leading-tight text-white/90">
          {lines.map((line) => (
            <span key={line} className="block">
              {line}.
            </span>
          ))}
        </p>
        <div className="mt-auto grid grid-cols-2 gap-1 pb-3 text-[7px]">
          <div className="rounded bg-white/15 py-1">Colis</div>
          <div className="rounded bg-white/15 py-1">Services</div>
          <div className="rounded bg-white/15 py-1">Boutiques</div>
          <div className="rounded bg-white/15 py-1">Réseau</div>
        </div>
      </div>
    </PhoneShell>
  );
}

function PreviewPhoneServices({ locale }: { locale: Locale }) {
  return (
    <PhoneShell className="h-[210px] w-[108px] bg-white sm:h-[230px] sm:w-[118px]">
      <div className="h-full bg-white px-2 pt-5 text-[8px]">
        <p className="font-semibold text-[#0b3d8c]">
          {t(locale, "nav_services")}
        </p>
        <div className="mt-2 space-y-1.5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 rounded-md bg-[#f3f7fb] px-1.5 py-1"
            >
              <Package className="h-3 w-3 text-[#0b3d8c]" />
              <div className="flex-1">
                <div className="h-1.5 w-12 rounded bg-[#0b3d8c]/40" />
                <div className="mt-1 h-1 w-8 rounded bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PhoneShell>
  );
}

function PreviewPhoneShops({ locale }: { locale: Locale }) {
  return (
    <PhoneShell className="hidden h-[210px] w-[108px] bg-white sm:block sm:h-[230px] sm:w-[118px]">
      <div className="h-full bg-white px-2 pt-5 text-[8px]">
        <p className="font-semibold text-[#0b3d8c]">
          {t(locale, "shops_title")}
        </p>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="aspect-square rounded-md bg-gradient-to-br from-slate-100 to-slate-200"
            />
          ))}
        </div>
      </div>
    </PhoneShell>
  );
}

export function DashboardAppTest({ locale, iosUrl, androidUrl }: Props) {
  const tagline = t(locale, "app_tagline");
  const bullets = [
    t(locale, "dashboard_preview_b1"),
    t(locale, "dashboard_preview_b2"),
    t(locale, "dashboard_preview_b3"),
    t(locale, "dashboard_preview_b4"),
  ];

  return (
    <section className="space-y-8">
      <div className="text-center">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#0b3d8c]">
          {t(locale, "tester_apps_title")}
        </h2>
        <p className="mt-1 text-sm text-[#4b5568]">
          {t(locale, "tester_apps_choose")}
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <a
          href={iosUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1d7dff] via-[#0b5cab] to-[#083a7a] p-6 text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl sm:p-8"
        >
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="max-w-[16rem]">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white" aria-hidden>
                  <path d="M16.7 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.9-3.5.9s-1.8-.8-3-.8c-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 3 2.3 1.2 0 1.6-.8 3-.8s1.8.8 3 .8 2-1.1 2.8-2.2c.9-1.3 1.3-2.5 1.3-2.6-.1 0-2.5-1-2.6-3.9ZM14.9 5.8c.6-.8 1.1-1.9.9-3-1 .1-2.2.7-2.9 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.2-.6 3-1.4Z" />
                </svg>
              </span>
              <h3 className="mt-4 text-xl font-bold leading-snug sm:text-2xl">
                {t(locale, "tester_ios_card_title")}
              </h3>
              <p className="mt-2 text-sm text-white/85">
                {t(locale, "tester_ios_card_desc")}
              </p>
              <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0b3d8c] transition group-hover:gap-3">
                {t(locale, "tester_ios_launch")}
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
            <StorePhone tone="ios" tagline={tagline} />
          </div>
        </a>

        <a
          href={androidUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#34d399] via-[#16a34a] to-[#166534] p-6 text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl sm:p-8"
        >
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="max-w-[16rem]">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                <Smartphone className="h-6 w-6" aria-hidden />
              </span>
              <h3 className="mt-4 text-xl font-bold leading-snug sm:text-2xl">
                {t(locale, "tester_android_card_title")}
              </h3>
              <p className="mt-2 text-sm text-white/85">
                {t(locale, "tester_android_card_desc")}
              </p>
              <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#166534] transition group-hover:gap-3">
                {t(locale, "tester_android_launch")}
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
            <StorePhone tone="android" tagline={tagline} />
          </div>
        </a>
      </div>

      <div className="overflow-hidden rounded-3xl border border-[#d6e4f5] bg-white px-6 py-8 shadow-sm sm:px-8">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div>
            <div className="flex items-center gap-2 text-[#0b3d8c]">
              <Smartphone className="h-5 w-5" aria-hidden />
              <h3 className="font-[family-name:var(--font-display)] text-xl font-bold">
                {t(locale, "dashboard_preview_title")}
              </h3>
            </div>
            <p className="mt-2 text-sm text-[#4b5568]">
              {t(locale, "dashboard_preview_lead")}
            </p>
            <ul className="mt-5 space-y-2.5 text-sm text-[#1f3b6d]">
              {bullets.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--rfacto-green)]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-end justify-center gap-2 sm:gap-3">
            <PreviewPhoneTrack locale={locale} />
            <PreviewPhoneHome tagline={tagline} />
            <PreviewPhoneServices locale={locale} />
            <PreviewPhoneShops locale={locale} />
          </div>
        </div>
        <p className="mt-8 text-center text-xs text-[#6b7280]">
          Rfacto — {t(locale, "app_tagline")}
        </p>
      </div>
    </section>
  );
}
