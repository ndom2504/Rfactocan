"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CountrySelect } from "@/components/country-select";
import { KYC_STATUS_LABELS } from "@/lib/corridors";
import { useI18n } from "@/components/locale-provider";

type User = {
  id: string;
  email: string;
  displayName: string;
  bio: string | null;
  country: string | null;
  avatarUrl: string | null;
  role: string;
  language?: string;
  preferredCurrency?: string;
  verifiedAt: string | null;
  ratingAvg: number;
  ratingCount: number;
  kycStatus?: string;
  kycVerifiedAt?: string | null;
  stripeConnectAccountId?: string | null;
  stripeConnectChargesEnabled?: boolean;
  stripeConnectPayoutsEnabled?: boolean;
};

function ProfileForm() {
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [role, setRole] = useState("BOTH");
  const [language, setLanguage] = useState("fr");
  const [preferredCurrency, setPreferredCurrency] = useState("CAD");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function load() {
    const res = await fetch("/api/profile");
    const data = await res.json();
    if (res.ok) {
      setUser(data.user);
      setDisplayName(data.user.displayName);
      setBio(data.user.bio ?? "");
      setCountry(data.user.country ?? "");
      setAvatarUrl(data.user.avatarUrl ?? null);
      setRole(data.user.role === "ADMIN" ? "BOTH" : data.user.role);
      setLanguage(data.user.language ?? "fr");
      setPreferredCurrency(data.user.preferredCurrency ?? "CAD");
    }
  }

  useEffect(() => {
    async function boot() {
      await load();
      const kyc = searchParams.get("kyc");
      const connect = searchParams.get("connect");

      if (kyc === "return") {
        try {
          const res = await fetch("/api/kyc");
          const data = await res.json();
          await load();
          if (data.user?.kycStatus === "VERIFIED") {
            setMessage("Identité vérifiée avec succès.");
          } else if (data.kycHint) {
            setError(data.kycHint);
          } else if (data.user?.kycStatus === "REQUIRES_INPUT") {
            setError(
              "Vérification refusée ou incomplète. Réessayez (Edge ou téléphone souvent plus fiable que Chrome si la caméra est bloquée)."
            );
          } else {
            setMessage(
              "Vérification reçue — statut mis à jour sous peu (webhook Stripe)."
            );
          }
        } catch {
          setMessage("Retour KYC — actualisez la page dans quelques secondes.");
        }
      }

      if (connect === "return") {
        setMessage("Onboarding paiements terminé — synchronisation en cours.");
        void fetch("/api/connect").then(() => load());
      }
      if (connect === "refresh") {
        setError(
          "Le lien a expiré. Relancez « Recevoir mes gains » pour configurer votre compte bancaire."
        );
      }
    }
    void boot();
  }, [searchParams]);

  async function onUploadAvatar(file: File) {
    setUploading(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) {
      setError(data.error ?? "Upload échoué");
      return;
    }
    setAvatarUrl(data.url);
    setMessage("Photo importée — cliquez sur Enregistrer pour confirmer.");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName,
        bio,
        country: country || undefined,
        avatarUrl,
        language,
        preferredCurrency,
        ...(user?.role !== "ADMIN" ? { role } : {}),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Erreur");
      return;
    }
    setUser(data.user);
    setMessage(t("profile_saved"));
    if (language === "fr" || language === "en") {
      await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: language }),
      });
    }
  }

  async function startKyc() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/kyc", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "KYC impossible");
        return;
      }
      if (data.alreadyVerified) {
        setMessage("Identité déjà vérifiée.");
        await load();
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(
        "Stripe n'a pas renvoyé de lien de vérification. Activez Identity dans le Dashboard Stripe."
      );
    } catch {
      setError("Erreur réseau lors du démarrage KYC.");
    } finally {
      setBusy(false);
    }
  }

  async function startConnect() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/connect", { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Connect impossible");
      return;
    }
    if (data.url) window.location.href = data.url;
  }

  if (!user) {
    return <p className="text-sm text-[var(--muted)]">{t("loading")}</p>;
  }

  const kycLabel =
    KYC_STATUS_LABELS[user.kycStatus ?? "NONE"] ?? user.kycStatus;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Card>
        <CardTitle>{t("trust_payments")}</CardTitle>
        <CardDescription>{t("trust_hint")}</CardDescription>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge
            className={
              user.kycStatus === "VERIFIED"
                ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                : undefined
            }
          >
            KYC : {kycLabel}
          </Badge>
          <Badge
            className={
              user.stripeConnectChargesEnabled &&
              user.stripeConnectPayoutsEnabled
                ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                : undefined
            }
          >
            {t("payments_label")} :{" "}
            {user.stripeConnectChargesEnabled && user.stripeConnectPayoutsEnabled
              ? t("gains_ready")
              : t("bank_to_setup")}
          </Badge>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {user.kycStatus !== "VERIFIED" && (
            <div className="space-y-2">
              <Button disabled={busy} onClick={startKyc}>
                {busy ? t("loading") : t("verify_identity")}
              </Button>
              <p className="text-xs text-[var(--muted)]">
                Redirection vers Stripe Identity (passeport / pièce + selfie).
                Si Chrome refuse la caméra, autorisez{" "}
                <span className="font-medium">verify.stripe.com</span> dans
                Paramètres → Confidentialité → Caméra, ou utilisez Edge / votre
                téléphone (option « autre appareil » dans Stripe).
              </p>
            </div>
          )}
          {user.kycStatus === "VERIFIED" &&
            !(
              user.stripeConnectChargesEnabled &&
              user.stripeConnectPayoutsEnabled
            ) && (
              <div className="space-y-2">
                <Button disabled={busy} onClick={startConnect}>
                  {busy ? t("loading") : t("receive_earnings")}
                </Button>
                <p className="text-xs text-[var(--muted)]">
                  {t("receive_earnings_hint")}
                </p>
              </div>
            )}
          {user.stripeConnectChargesEnabled &&
            user.stripeConnectPayoutsEnabled && (
              <p className="text-sm text-[var(--accent)]">{t("bank_ready")}</p>
            )}
        </div>
      </Card>

      <Card>
        <CardTitle>{t("profile_title")}</CardTitle>
        <CardDescription>{user.email}</CardDescription>
        <div className="mt-3 flex flex-wrap gap-2">
          {(user.verifiedAt || user.kycStatus === "VERIFIED") && (
            <Badge className="bg-[var(--accent-soft)] text-[var(--accent)]">
              {t("account_verified")}
            </Badge>
          )}
          <Badge>
            ★ {user.ratingCount ? user.ratingAvg.toFixed(1) : "—"} (
            {user.ratingCount})
          </Badge>
          <Badge>{user.role}</Badge>
        </div>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-3">
            <Label>{t("photo")}</Label>
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-2)]">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={t("photo")}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-[var(--muted)]">
                    {t("no_photo")}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void onUploadAvatar(file);
                    e.target.value = "";
                  }}
                />
                {avatarUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAvatarUrl(null)}
                  >
                    {t("remove_photo")}
                  </Button>
                )}
                {uploading && (
                  <p className="text-xs text-[var(--muted)]">{t("uploading")}</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("display_name")}</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>

          <CountrySelect value={country} onChange={setCountry} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("language")}</Label>
              <Select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("preferred_currency")}</Label>
              <Select
                value={preferredCurrency}
                onChange={(e) => setPreferredCurrency(e.target.value)}
              >
                <option value="CAD">CAD</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("bio")}</Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
          {user.role !== "ADMIN" && (
            <div className="space-y-2">
              <Label>{t("role")}</Label>
              <Select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="SENDER">{t("role_sender")}</option>
                <option value="TRAVELER">{t("role_traveler")}</option>
                <option value="BOTH">{t("role_both")}</option>
              </Select>
            </div>
          )}
          {error && <p className="text-sm text-red-700">{error}</p>}
          {message && <p className="text-sm text-[var(--accent)]">{message}</p>}
          <Button type="submit" disabled={uploading}>
            {t("save")}
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense>
      <ProfileForm />
    </Suspense>
  );
}
