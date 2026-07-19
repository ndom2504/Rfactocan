"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { PasswordInput } from "@/components/password-input";
import { useI18n } from "@/components/locale-provider";
import { isTourDone, markTourPendingIfNeeded } from "@/lib/guided-tour";

const ERROR_MESSAGES: Record<string, { fr: string; en: string }> = {
  google_not_configured: {
    fr: "Google Auth n'est pas encore configuré.",
    en: "Google Auth is not configured yet.",
  },
  invalid_oauth_state: {
    fr: "Session Google invalide. Réessayez.",
    en: "Invalid Google session. Try again.",
  },
  google_email_required: {
    fr: "Google n'a pas fourni d'email.",
    en: "Google did not provide an email.",
  },
  google_email_unverified: {
    fr: "Votre email Google n'est pas vérifié.",
    en: "Your Google email is not verified.",
  },
  account_suspended: {
    fr: "Ce compte est suspendu.",
    en: "This account is suspended.",
  },
  google_auth_failed: {
    fr: "Échec de la connexion Google. Réessayez.",
    en: "Google sign-in failed. Try again.",
  },
  access_denied: {
    fr: "Connexion Google annulée.",
    en: "Google sign-in cancelled.",
  },
  otp_send_failed: {
    fr: "Impossible d'envoyer le code de vérification. Réessayez.",
    en: "Could not send the verification code. Try again.",
  },
  otp_domain_not_verified: {
    fr: "Vérification indisponible pour les autres comptes : configurez un domaine vérifié sur Resend (EMAIL_FROM), pas onboarding@resend.dev.",
    en: "Verification unavailable for other accounts: verify a domain on Resend and set EMAIL_FROM (not onboarding@resend.dev).",
  },
};

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { t, locale } = useI18n();
  const oauthError = params.get("error");
  const errorDetail = params.get("detail");
  const errorFrom = params.get("from");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [emailHint, setEmailHint] = useState("");
  const [error, setError] = useState(() => {
    if (!oauthError) return "";
    const base =
      ERROR_MESSAGES[oauthError]?.[locale] || oauthError;
    const extras = [errorFrom ? `From: ${errorFrom}` : "", errorDetail || ""]
      .filter(Boolean)
      .join(" — ");
    return extras ? `${base} (${extras})` : base;
  });
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [info, setInfo] = useState("");

  useEffect(() => {
    const mfa = params.get("mfa");
    const token = params.get("mfaToken");
    const hint = params.get("emailHint");
    if (mfa === "1" && token) {
      setMfaToken(token);
      setEmailHint(hint || "");
      setInfo(t("otp_sent"));
      setError("");
    }
  }, [params, t]);

  function goNext() {
    markTourPendingIfNeeded();
    const next = params.get("next");
    let safeNext =
      next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
    if (!isTourDone() && safeNext === "/dashboard") {
      safeNext = "/dashboard?tour=1";
    }
    router.push(safeNext);
    router.refresh();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Connexion impossible");
      return;
    }
    if (data.mfaRequired && data.mfaToken) {
      setMfaToken(data.mfaToken);
      setEmailHint(data.emailHint || email);
      setInfo(t("otp_sent"));
      return;
    }
    goNext();
  }

  async function onVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!mfaToken) return;
    setLoading(true);
    setError("");
    setInfo("");
    const res = await fetch("/api/auth/login/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mfaToken, code: otpCode }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? t("otp_invalid"));
      return;
    }
    goNext();
  }

  async function onResend() {
    if (!mfaToken) return;
    setResendLoading(true);
    setError("");
    setInfo("");
    const res = await fetch("/api/auth/login/resend-otp", {
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
    setInfo(t("otp_resent"));
  }

  if (mfaToken) {
    return (
      <Card className="w-full">
        <CardTitle>{t("otp_title")}</CardTitle>
        <CardDescription>
          {t("otp_subtitle")} {emailHint}
        </CardDescription>

        <form onSubmit={onVerifyOtp} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp">{t("otp_code")}</Label>
            <Input
              id="otp"
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
            onClick={onResend}
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
              router.replace("/login");
            }}
          >
            {t("otp_back")}
          </button>
        </form>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardTitle>{t("login_title")}</CardTitle>
      <CardDescription>{t("login_subtitle")}</CardDescription>

      <div className="mt-6 space-y-4">
        <GoogleSignInButton />
        <div className="relative py-1 text-center text-xs text-[var(--muted)]">
          <span className="bg-[var(--surface)] px-2 relative z-10">
            {locale === "en" ? "or" : "ou"}
          </span>
          <div className="absolute inset-x-0 top-1/2 border-t border-[var(--border)]" />
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-2 space-y-4">
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
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="password">{t("password")}</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-[var(--accent)] underline"
            >
              {t("forgot_password")}
            </Link>
          </div>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            showLabel={t("show_password")}
            hideLabel={t("hide_password")}
          />
        </div>
        {params.get("reset") === "1" && !error && (
          <p className="text-sm text-[var(--accent)]">{t("reset_success")}</p>
        )}
        {error && <p className="text-sm text-red-700">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? t("loading") : t("sign_in")}
        </Button>
      </form>
      <p className="mt-4 text-sm text-[var(--muted)]">
        {t("no_account")}{" "}
        <Link href="/register" className="text-[var(--accent)] underline">
          {t("nav_signup")}
        </Link>
      </p>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md items-center px-6">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
