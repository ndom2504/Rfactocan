"use client";

import { useEffect, useState } from "react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

type AdminData = {
  stats: {
    users: number;
    trips: number;
    requests: number;
    delivered: number;
    openReports: number;
  };
  users: Array<{
    id: string;
    email: string;
    displayName: string;
    role: string;
    status: string;
    verifiedAt: string | null;
    ratingAvg: number;
    createdAt: string;
  }>;
  openReports: Array<{
    id: string;
    reason: string;
    details: string | null;
    createdAt: string;
    reporter: { displayName: string; email: string };
    targetUser: { id: string; displayName: string; email: string };
  }>;
};

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/admin");
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Accès refusé");
      return;
    }
    setData(json);
  }

  useEffect(() => {
    void load();
  }, []);

  async function action(userId: string, actionName: string) {
    await fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action: actionName }),
    });
    await load();
  }

  async function resolveReport(reportId: string) {
    await fetch("/api/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId, resolved: true }),
    });
    await load();
  }

  if (error) {
    return <p className="text-sm text-red-700">{error}</p>;
  }
  if (!data) {
    return <p className="text-sm text-[var(--muted)]">Chargement...</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          Administration
        </h1>
        <p className="text-[var(--muted)]">
          Validation des profils, suspensions et litiges.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Utilisateurs", data.stats.users],
          ["Voyages", data.stats.trips],
          ["Demandes", data.stats.requests],
          ["Livrés", data.stats.delivered],
          ["Signalements", data.stats.openReports],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <CardDescription>{label}</CardDescription>
            <CardTitle className="mt-2 text-2xl">{value}</CardTitle>
          </Card>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Utilisateurs
        </h2>
        {data.users.map((u) => (
          <Card key={u.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">{u.displayName}</CardTitle>
                <CardDescription>
                  {u.email} · {u.role} · inscrit {formatDate(u.createdAt)}
                </CardDescription>
                <div className="mt-2 flex gap-2">
                  <Badge>{u.status}</Badge>
                  {u.verifiedAt ? (
                    <Badge className="bg-[var(--accent-soft)] text-[var(--accent)]">
                      Vérifié
                    </Badge>
                  ) : (
                    <Badge>Non vérifié</Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {!u.verifiedAt && (
                  <Button size="sm" onClick={() => action(u.id, "verify")}>
                    Vérifier
                  </Button>
                )}
                {u.verifiedAt && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => action(u.id, "unverify")}
                  >
                    Retirer vérif.
                  </Button>
                )}
                {u.status !== "SUSPENDED" ? (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => action(u.id, "suspend")}
                  >
                    Suspendre
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => action(u.id, "activate")}
                  >
                    Réactiver
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Signalements ouverts
        </h2>
        {data.openReports.length === 0 && (
          <p className="text-sm text-[var(--muted)]">Aucun signalement.</p>
        )}
        {data.openReports.map((r) => (
          <Card key={r.id}>
            <CardTitle className="text-base">
              {r.targetUser.displayName} signalé par {r.reporter.displayName}
            </CardTitle>
            <CardDescription>
              {r.reason}
              {r.details ? ` — ${r.details}` : ""}
            </CardDescription>
            <div className="mt-3">
              <Button size="sm" onClick={() => resolveReport(r.id)}>
                Marquer résolu
              </Button>
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
