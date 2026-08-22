"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/locale-provider";

type Props = {
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  role?: "SENDER" | "TRAVELER" | "BOTH";
  refCode?: string | null;
  onLoggedIn: () => void;
};

export function PhoneOtpAuth({
  displayName,
  onDisplayNameChange,
  role,
  refCode,
  onLoggedIn,
}: Props) {
  const { t } = useI18n();
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [phoneHint, setPhoneHint] = useState("");
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");
    const res = await fetch("/api/auth/phone/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? t("phone_otp_send_error"));
      return;
    }
    setMfaToken(data.mfaToken);
    setPhoneHint(data.phoneHint || phone);
    setIsNew(Boolean(data.isNew));
    setInfo(t("phone_otp_sent"));
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!mfaToken) return;
    if (isNew && displayName.trim().length < 2) {
      setError(t("phone_otp_name_required"));
      return;
    }
    setLoading(true);
    setError("");
    setInfo("");
    const res = await fetch("/api/auth/phone/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mfaToken,
        code: otpCode,
        displayName: displayName.trim() || undefined,
        role,
        ref: refCode || undefined,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      if (data.needsProfile) setIsNew(true);
      setError(data.error ?? t("otp_invalid"));
      return;
    }
    onLoggedIn();
  }

  async function resend() {
    if (!mfaToken) return;
    setResendLoading(true);
    setError("");
    setInfo("");
    const res = await fetch("/api/auth/phone/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mfaToken }),
    });
    const data = await res.json();
    setResendLoading(false);
    if (!res.ok) {
      setError(data.error ?? t("otp_resend_error"));
      return;
    }
    if (data.mfaToken) setMfaToken(data.mfaToken);
    if (data.phoneHint) setPhoneHint(data.phoneHint);
    setInfo(t("otp_resent"));
  }

  if (mfaToken) {
    return (
      <form onSubmit={verifyCode} className="space-y-4">
        <p className="text-sm text-[var(--muted)]">
          {t("otp_subtitle")} {phoneHint}
        </p>
        {isNew && (
          <div className="space-y-2">
            <Label htmlFor="phone-display-name">{t("display_name")}</Label>
            <Input
              id="phone-display-name"
              value={displayName}
              onChange={(e) => onDisplayNameChange(e.target.value)}
              required
              minLength={2}
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="phone-otp">{t("otp_code")}</Label>
          <Input
            id="phone-otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            value={otpCode}
            onChange={(e) =>
              setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="000000"
            required
            className="tracking-[0.35em] text-center text-lg"
          />
        </div>
        {info && !error && (
          <p className="text-sm text-[var(--accent)]">{info}</p>
        )}
        {error && <p className="text-sm text-red-700">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? t("loading") : t("otp_verify")}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={resendLoading}
          onClick={() => void resend()}
        >
          {resendLoading ? t("loading") : t("otp_resend")}
        </Button>
        <button
          type="button"
          className="w-full text-sm text-[var(--muted)] underline"
          onClick={() => {
            setMfaToken(null);
            setOtpCode("");
            setInfo("");
            setError("");
          }}
        >
          {t("otp_back")}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={requestCode} className="space-y-4">
      <p className="text-sm text-[var(--muted)]">{t("phone_otp_lead")}</p>
      <div className="space-y-2">
        <Label htmlFor="ga-phone">{t("phone_ga_label")}</Label>
        <div className="flex gap-2">
          <span className="flex h-10 items-center rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--muted)]">
            +241
          </span>
          <Input
            id="ga-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t("phone_ga_placeholder")}
            required
          />
        </div>
      </div>
      {info && !error && (
        <p className="text-sm text-[var(--accent)]">{info}</p>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? t("loading") : t("phone_otp_send")}
      </Button>
    </form>
  );
}
