"use client";

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/locale-provider";
import { getPhonePlan, listPhoneCountries } from "@/lib/phone-countries";

type Props = {
  region: string;
  onRegionChange: (code: string) => void;
  phone: string;
  onPhoneChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
};

export function CountryPhoneFields({
  region,
  onRegionChange,
  phone,
  onPhoneChange,
  id = "auth-phone",
  disabled,
}: Props) {
  const { t, locale } = useI18n();
  const countries = useMemo(() => listPhoneCountries(), []);
  const plan = getPhonePlan(region) ?? getPhonePlan("CA")!;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor={`${id}-country`}>{t("phone_country")}</Label>
        <select
          id={`${id}-country`}
          value={plan.code}
          disabled={disabled}
          onChange={(e) => onRegionChange(e.target.value)}
          className="flex h-10 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)] outline-none focus:ring-2 focus:ring-[var(--accent)]"
        >
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {locale === "en" ? c.nameEn : c.name} ({c.dial})
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={id}>{t("phone_ga_label")}</Label>
        <div className="flex gap-2">
          <span className="flex h-10 shrink-0 items-center rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--muted)]">
            +{plan.dial}
          </span>
          <Input
            id={id}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            disabled={disabled}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder={plan.placeholder}
            required
          />
        </div>
      </div>
    </div>
  );
}
