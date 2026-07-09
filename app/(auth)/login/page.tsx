"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { useI18n } from "@/components/locale-provider";

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
};

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { t, locale } = useI18n();
  const oauthError = params.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(
    oauthError
      ? ERROR_MESSAGES[oauthError]?.[locale] || oauthError
      : ""
  );
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
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
    router.push("/dashboard");
    router.refresh();
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
          <Label htmlFor="password">{t("password")}</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
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
