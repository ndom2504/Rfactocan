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
import { KYC_STATUS_LABELS } from "@/lib/corridors";

type User = {
  id: string;
  email: string;
  displayName: string;
  bio: string | null;
  country: string | null;
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
  const [role, setRole] = useState("BOTH");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/profile");
    const data = await res.json();
    if (res.ok) {
      setUser(data.user);
      setDisplayName(data.user.displayName);
      setBio(data.user.bio ?? "");
      setCountry(data.user.country ?? "");
      setRole(data.user.role === "ADMIN" ? "BOTH" : data.user.role);
    }
  }

  useEffect(() => {
    void load();
    const kyc = searchParams.get("kyc");
    const connect = searchParams.get("connect");
    if (kyc === "return") setMessage("Vérification d'identité terminée — statut mis à jour sous peu.");
    if (connect === "return") {
      setMessage("Onboarding paiements terminé — synchronisation en cours.");
      void fetch("/api/connect").then(() => load());
    }
    if (connect === "refresh") {
      setError("Le lien Connect a expiré. Relancez l'activation des paiements.");
    }
  }, [searchParams]);

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
        country,
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
    const res = await fetch("/api/kyc", { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "KYC impossible");
      return;
    }
    if (data.alreadyVerified) {
      setMessage("Identité déjà vérifiée.");
      await load();
      return;
    }
    if (data.url) window.location.href = data.url;
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

  const kycLabel = KYC_STATUS_LABELS[user.kycStatus ?? "NONE"] ?? user.kycStatus;

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
              user.stripeConnectChargesEnabled
                ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                : undefined
            }
          >
            Paiements :{" "}
            {user.stripeConnectChargesEnabled ? "Activés" : "Non activés"}
          </Badge>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {user.kycStatus !== "VERIFIED" && (
            <Button disabled={busy} onClick={startKyc}>
              Vérifier mon identité
            </Button>
          )}
          {user.kycStatus === "VERIFIED" && !user.stripeConnectChargesEnabled && (
            <Button disabled={busy} onClick={startConnect}>
              Activer les paiements (Stripe)
            </Button>
          )}
          {user.stripeConnectChargesEnabled && (
            <p className="text-sm text-[var(--accent)]">
              Vous pouvez accepter des réservations et recevoir des fonds après
              livraison.
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
          <div className="space-y-2">
            <Label>Nom affiché</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Pays</Label>
            <Input value={country} onChange={(e) => setCountry(e.target.value)} />
          </div>
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
          <Button type="submit">Enregistrer</Button>
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
