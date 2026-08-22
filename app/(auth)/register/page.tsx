"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { PasswordInput } from "@/components/password-input";
import { IntentPicker } from "@/components/intent-picker";
import { CountrySelect } from "@/components/country-select";
import { CountrySuggest } from "@/components/country-suggest";
import { PhoneOtpAuth } from "@/components/phone-otp-auth";
import { useI18n } from "@/components/locale-provider";
import { markTourPendingIfNeeded } from "@/lib/guided-tour";
import { safeNextPath } from "@/lib/app-url";
import {
  fetchSuggestedCountry,
  resolveCountryCode,
} from "@/lib/detect-country";
import { getCountryName } from "@/lib/corridors";
import {
  intentToApiRole,
  normalizePrimaryIntent,
  saveUserIntent,
  type CarrierType,
  type PrimaryIntent,
} from "@/lib/user-intent";

const REF_COOKIE = "rfacto_ref";
const REF_MAX_AGE = 60 * 60 * 24 * 30;

function readRefCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${REF_COOKIE}=`));
  if (!match) return null;
  return decodeURIComponent(match.split("=").slice(1).join("=")) || null;
}

function persistRefCode(code: string) {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return;
  document.cookie = `${REF_COOKIE}=${encodeURIComponent(normalized)}; path=/; max-age=${REF_MAX_AGE}; samesite=lax`;
}

function initialIntentFromParams(role: string | null): PrimaryIntent {
  return normalizePrimaryIntent(role);
}

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { t, locale } = useI18n();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [primaryIntent, setPrimaryIntent] = useState<PrimaryIntent>(() =>
    initialIntentFromParams(params.get("role") ?? params.get("intent"))
  );
  const [carrierType, setCarrierType] = useState<CarrierType>("particulier");
  const [country, setCountry] = useState("");
  const [refCode, setRefCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const role = useMemo(
    () => intentToApiRole(primaryIntent),
    [primaryIntent]
  );
  const phoneSignup = resolveCountryCode(country) === "GA";

  useEffect(() => {
    const fromQuery = params.get("ref")?.trim().toUpperCase() || null;
    if (fromQuery) {
      persistRefCode(fromQuery);
      setRefCode(fromQuery);
      return;
    }
    setRefCode(readRefCookie());
  }, [params]);

  useEffect(() => {
    let cancelled = false;
    fetchSuggestedCountry()
      .then((detected) => {
        if (cancelled || !detected?.code) return;
        setCountry((current) =>
          current ? current : getCountryName(detected.code) || detected.name
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    saveUserIntent({ primaryIntent, carrierType });
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName,
        email,
        password,
        role,
        country: country || undefined,
        ref: refCode || undefined,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Inscription impossible");
      return;
    }
    finishSignup();
  }

  function finishSignup() {
    markTourPendingIfNeeded();
    const next = safeNextPath(params.get("next"));
    router.push(next === "/dashboard" ? "/dashboard?tour=1" : next);
    router.refresh();
  }

  function goAfterAuth() {
    saveUserIntent({ primaryIntent, carrierType });
    finishSignup();
  }

  return (
    <Card className="w-full" data-auth-card>
      <CardTitle>{t("register_title")}</CardTitle>
      <CardDescription>{t("register_subtitle")}</CardDescription>
      {refCode && (
        <p className="mt-2 text-xs text-[var(--muted)]">
          {locale === "en"
            ? `Invited via agent code ${refCode}`
            : `Inscription via code agent ${refCode}`}
        </p>
      )}

      <div className="mt-6 space-y-4">
        <GoogleSignInButton
          label={
            locale === "en" ? "Sign up with Google" : "S'inscrire avec Google"
          }
          next={params.get("next")}
        />
        <div className="relative py-1 text-center text-xs text-[var(--muted)]">
          <span className="bg-[var(--surface)] px-2 relative z-10">
            {locale === "en" ? "or" : "ou"}
          </span>
          <div className="absolute inset-x-0 top-1/2 border-t border-[var(--border)]" />
        </div>
      </div>

      <div className="mt-2 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="displayName">{t("display_name")}</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required={!phoneSignup}
          />
        </div>
        <IntentPicker
          primaryIntent={primaryIntent}
          carrierType={carrierType}
          onPrimaryIntentChange={setPrimaryIntent}
          onCarrierTypeChange={setCarrierType}
        />
        <div className="space-y-2">
          <CountrySelect value={country} onChange={setCountry} />
          <CountrySuggest
            value={country}
            onApply={(name) => setCountry(name)}
            onlyIfEmpty
          />
        </div>
        {phoneSignup ? (
          <PhoneOtpAuth
            displayName={displayName}
            onDisplayNameChange={setDisplayName}
            role={role}
            refCode={refCode}
            onLoggedIn={goAfterAuth}
          />
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <PasswordInput
                id="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                showLabel={t("show_password")}
                hideLabel={t("hide_password")}
              />
            </div>
            {error && <p className="text-sm text-red-700">{error}</p>}
            <p className="text-xs leading-relaxed text-[var(--muted)]">
              {t("terms_accept_register")}{" "}
              <Link href="/terms" className="text-[var(--accent)] underline">
                {t("nav_terms")}
              </Link>
              {" · "}
              <Link href="/privacy" className="text-[var(--accent)] underline">
                {t("nav_privacy")}
              </Link>
            </p>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("loading") : t("create_account")}
            </Button>
          </form>
        )}
        {phoneSignup && (
          <p className="text-xs leading-relaxed text-[var(--muted)]">
            {t("terms_accept_register")}{" "}
            <Link href="/terms" className="text-[var(--accent)] underline">
              {t("nav_terms")}
            </Link>
            {" · "}
            <Link href="/privacy" className="text-[var(--accent)] underline">
              {t("nav_privacy")}
            </Link>
          </p>
        )}
      </div>
      <p className="mt-4 text-sm text-[var(--muted)]">
        {t("have_account")}{" "}
        <Link
          href={
            params.get("next")
              ? `/login?next=${encodeURIComponent(params.get("next")!)}`
              : "/login"
          }
          className="text-[var(--accent)] underline"
        >
          {t("sign_in")}
        </Link>
      </p>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
