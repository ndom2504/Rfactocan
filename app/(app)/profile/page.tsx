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

type User = {
  id: string;
  email: string;
  displayName: string;
  bio: string | null;
  country: string | null;
  avatarUrl: string | null;
  role: string;
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
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [role, setRole] = useState("BOTH");
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
        ...(user?.role !== "ADMIN" ? { role } : {}),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Erreur");
      return;
    }
    setUser(data.user);
    setMessage("Profil mis à jour.");
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
    return <p className="text-sm text-[var(--muted)]">Chargement...</p>;
  }

  const kycLabel =
    KYC_STATUS_LABELS[user.kycStatus ?? "NONE"] ?? user.kycStatus;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Card>
        <CardTitle>Confiance & paiements</CardTitle>
        <CardDescription>
          Obligatoire pour accepter des colis en tant que voyageur.
        </CardDescription>
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
            Paiements :{" "}
            {user.stripeConnectChargesEnabled && user.stripeConnectPayoutsEnabled
              ? "Gains prêts"
              : "Compte bancaire à configurer"}
          </Badge>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {user.kycStatus !== "VERIFIED" && (
            <div className="space-y-2">
              <Button disabled={busy} onClick={startKyc}>
                {busy ? "Ouverture…" : "Vérifier mon identité"}
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
                  {busy ? "Ouverture…" : "Recevoir mes gains (compte bancaire)"}
                </Button>
                <p className="text-xs text-[var(--muted)]">
                  Ouverture d&apos;un compte Stripe Express pour recevoir vos
                  gains après chaque livraison (particulier, pas un commerce).
                </p>
              </div>
            )}
          {user.stripeConnectChargesEnabled &&
            user.stripeConnectPayoutsEnabled && (
              <p className="text-sm text-[var(--accent)]">
                Compte bancaire prêt : vous pouvez accepter des colis et
                recevoir vos gains après livraison.
              </p>
            )}
        </div>
      </Card>

      <Card>
        <CardTitle>Mon profil</CardTitle>
        <CardDescription>{user.email}</CardDescription>
        <div className="mt-3 flex flex-wrap gap-2">
          {(user.verifiedAt || user.kycStatus === "VERIFIED") && (
            <Badge className="bg-[var(--accent-soft)] text-[var(--accent)]">
              Compte vérifié
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
            <Label>Photo de profil</Label>
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-2)]">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt="Photo de profil"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-[var(--muted)]">
                    Aucune
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
                    Retirer la photo
                  </Button>
                )}
                {uploading && (
                  <p className="text-xs text-[var(--muted)]">Téléversement…</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nom affiché</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>

          <CountrySelect value={country} onChange={setCountry} />

          <div className="space-y-2">
            <Label>Bio</Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
          {user.role !== "ADMIN" && (
            <div className="space-y-2">
              <Label>Rôle</Label>
              <Select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="SENDER">Expéditeur</option>
                <option value="TRAVELER">Voyageur</option>
                <option value="BOTH">Les deux</option>
              </Select>
            </div>
          )}
          {error && <p className="text-sm text-red-700">{error}</p>}
          {message && <p className="text-sm text-[var(--accent)]">{message}</p>}
          <Button type="submit" disabled={uploading}>
            Enregistrer
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
