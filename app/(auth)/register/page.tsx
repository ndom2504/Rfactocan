"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const initialRole = params.get("role");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(
    initialRole === "SENDER" || initialRole === "TRAVELER" ? initialRole : "BOTH"
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
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
      <CardTitle>Créer un compte</CardTitle>
      <CardDescription>
        Rejoignez Rfacto en tant qu&apos;expéditeur, voyageur, ou les deux.
      </CardDescription>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="displayName">Nom affiché</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Je suis</Label>
          <Select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="SENDER">Expéditeur</option>
            <option value="TRAVELER">Voyageur</option>
            <option value="BOTH">Les deux</option>
          </Select>
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Création..." : "S'inscrire"}
        </Button>
      </form>
      <p className="mt-4 text-sm text-[var(--muted)]">
        Déjà inscrit ?{" "}
        <Link href="/login" className="text-[var(--accent)] underline">
          Se connecter
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
