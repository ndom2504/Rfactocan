"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
};

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [role, setRole] = useState("BOTH");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/profile");
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setDisplayName(data.user.displayName);
        setBio(data.user.bio ?? "");
        setCountry(data.user.country ?? "");
        setRole(data.user.role === "ADMIN" ? "BOTH" : data.user.role);
      }
    })();
  }, []);

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

  if (!user) {
    return <p className="text-sm text-[var(--muted)]">Chargement...</p>;
  }

  return (
    <Card className="max-w-xl">
      <CardTitle>Mon profil</CardTitle>
      <CardDescription>{user.email}</CardDescription>
      <div className="mt-3 flex flex-wrap gap-2">
        {user.verifiedAt && (
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
          <Input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          />
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
  );
}
