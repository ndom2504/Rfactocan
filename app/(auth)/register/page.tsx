"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { PasswordInput } from "@/components/password-input";
import { IntentPicker } from "@/components/intent-picker";
import { useI18n } from "@/components/locale-provider";
import {
  intentToApiRole,
  saveUserIntent,
  type CarrierType,
  type OrderIntent,
  type PrimaryIntent,
} from "@/lib/user-intent";

function initialIntentFromParams(role: string | null): PrimaryIntent {
  if (role === "SENDER" || role === "commander") return "commander";
  if (role === "TRAVELER" || role === "livrer") return "livrer";
  return "both";
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
  const [orderIntent, setOrderIntent] = useState<OrderIntent>("envoyer");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const role = useMemo(
    () => intentToApiRole(primaryIntent),
    [primaryIntent]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    saveUserIntent({ primaryIntent, carrierType, orderIntent });
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, email, password, role }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Inscription impossible");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="w-full">
      <CardTitle>{t("register_title")}</CardTitle>
      <CardDescription>{t("register_subtitle")}</CardDescription>

      <div className="mt-6 space-y-4">
        <GoogleSignInButton
          label={
            locale === "en" ? "Sign up with Google" : "S'inscrire avec Google"
          }
        />
        <div className="relative py-1 text-center text-xs text-[var(--muted)]">
          <span className="bg-[var(--surface)] px-2 relative z-10">
            {locale === "en" ? "or" : "ou"}
          </span>
          <div className="absolute inset-x-0 top-1/2 border-t border-[var(--border)]" />
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-2 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="displayName">{t("display_name")}</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </div>
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
        <IntentPicker
          primaryIntent={primaryIntent}
          carrierType={carrierType}
          orderIntent={orderIntent}
          onPrimaryIntentChange={setPrimaryIntent}
          onCarrierTypeChange={setCarrierType}
          onOrderIntentChange={setOrderIntent}
        />
        {error && <p className="text-sm text-red-700">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? t("loading") : t("create_account")}
        </Button>
      </form>
      <p className="mt-4 text-sm text-[var(--muted)]">
        {t("have_account")}{" "}
        <Link href="/login" className="text-[var(--accent)] underline">
          {t("sign_in")}
        </Link>
      </p>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md items-center px-6">
      <Suspense>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
