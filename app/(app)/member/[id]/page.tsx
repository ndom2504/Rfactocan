"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { UserAvatar } from "@/components/user-avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { useI18n } from "@/components/locale-provider";
import { formatDate } from "@/lib/utils";

type MemberUser = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  country: string | null;
  verified: boolean;
  ratingAvg: number;
  ratingCount: number;
  completedDeliveries: number;
  createdAt: string;
  isOwner: boolean;
  connectionCount: number;
  connectedByMe: boolean;
};

type MemberConnection = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

type MemberData = {
  user: MemberUser;
  stats: {
    connections: number;
    deliveries: number;
    ratingAvg: number;
    ratingCount: number;
    trips: number;
    services: number;
    shops: number;
    parcels: number;
  };
  connections: MemberConnection[];
  projects: {
    trips: {
      id: string;
      fromCity: string;
      toCity: string;
      departAt: string;
    }[];
    services: { id: string; title: string; city?: string; country?: string }[];
    shops: { id: string; name: string; city?: string; country?: string }[];
    parcels: {
      id: string;
      fromCity: string;
      toCity: string;
      desiredDate?: string | null;
    }[];
  };
};

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-[4.5rem] flex-1 rounded-xl bg-[var(--surface-2)] px-3 py-3 text-center">
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-[11px] text-[var(--muted)]">{label}</p>
    </div>
  );
}

export default function MemberProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const [data, setData] = useState<MemberData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"connect" | "message" | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError("");
    try {
      const res = await fetch(`/api/members/${id}`);
      const json = (await res.json()) as MemberData & { error?: string };
      if (!res.ok) throw new Error(json.error || "Erreur");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleConnect() {
    if (!data || data.user.isOwner) return;
    setBusy("connect");
    setError("");
    try {
      const connected = data.user.connectedByMe;
      const res = await fetch(
        connected
          ? `/api/connections?userId=${encodeURIComponent(data.user.id)}`
          : "/api/connections",
        connected
          ? { method: "DELETE" }
          : {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: data.user.id }),
            }
      );
      const json = (await res.json()) as {
        error?: string;
        connected?: boolean;
        connectionCount?: number;
      };
      if (!res.ok) throw new Error(json.error || "Erreur");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(null);
    }
  }

  async function openMessage() {
    if (!data || data.user.isOwner) return;
    setBusy("message");
    setError("");
    try {
      const res = await fetch("/api/dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId: data.user.id }),
      });
      const json = (await res.json()) as {
        error?: string;
        thread?: { id: string };
        threadId?: string;
      };
      if (!res.ok) throw new Error(json.error || "Erreur");
      const threadId = json.thread?.id ?? json.threadId;
      if (threadId) router.push(`/messages/dm/${threadId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">{t("loading")}</p>;
  }

  if (!data) {
    return <p className="text-sm text-red-700">{error || "Profil introuvable"}</p>;
  }

  const { user, stats, connections, projects } = data;
  const emptyProjects =
    projects.trips.length === 0 &&
    projects.services.length === 0 &&
    projects.shops.length === 0 &&
    projects.parcels.length === 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/community" className="text-sm text-[var(--accent)] hover:underline">
        ← {t("community_title")}
      </Link>

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="h-36 bg-[var(--surface-2)]">
          {user.bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={
                user.bannerUrl.includes("blob.vercel-storage.com") &&
                !user.bannerUrl.includes("/api/media")
                  ? `/api/media?url=${encodeURIComponent(user.bannerUrl)}`
                  : user.bannerUrl
              }
              alt=""
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
        <div className="-mt-8 space-y-3 px-5 pb-5">
          <UserAvatar
            name={user.displayName}
            avatarUrl={user.avatarUrl}
            size="xl"
            className="ring-4 ring-[var(--surface)]"
          />
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
              {user.displayName}
            </h1>
            {user.verified ? (
              <p className="text-sm font-medium text-[var(--accent)]">{t("verified")}</p>
            ) : null}
            {user.country ? (
              <p className="text-sm text-[var(--muted)]">{user.country}</p>
            ) : null}
            {user.bio ? <p className="mt-2 text-sm leading-relaxed">{user.bio}</p> : null}
            <p className="mt-1 text-xs text-[var(--muted)]">
              {t("member_since")} {formatDate(user.createdAt)}
            </p>
          </div>

          {error ? <p className="text-sm text-red-700">{error}</p> : null}

          {user.isOwner ? (
            <Link href="/profile" className={buttonVariants({ variant: "outline" })}>
              {t("member_edit_profile")}
            </Link>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={busy !== null}
                onClick={() => void toggleConnect()}
              >
                {user.connectedByMe ? t("community_connected") : t("community_connect")}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy !== null}
                onClick={() => void openMessage()}
              >
                {t("community_message")}
              </Button>
            </div>
          )}
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="font-semibold">{t("member_performance")}</h2>
        <div className="flex flex-wrap gap-2">
          <Stat
            value={stats.ratingCount ? stats.ratingAvg.toFixed(1) : "—"}
            label={t("member_rating")}
          />
          <Stat value={String(stats.deliveries)} label={t("member_deliveries")} />
          <Stat value={String(stats.connections)} label={t("community_connections")} />
          <Stat
            value={String(stats.trips + stats.services + stats.shops)}
            label={t("member_projects")}
          />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">{t("member_connections")}</h2>
        {connections.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">{t("member_no_connections")}</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {connections.map((c) => (
              <Link
                key={c.id}
                href={`/member/${c.id}`}
                className="flex w-16 flex-col items-center gap-1"
              >
                <UserAvatar name={c.displayName} avatarUrl={c.avatarUrl} size="md" />
                <span className="line-clamp-1 text-center text-[11px]">
                  {c.displayName}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">{t("member_projects")}</h2>
        {emptyProjects ? (
          <p className="text-sm text-[var(--muted)]">{t("member_no_projects")}</p>
        ) : null}
        <ul className="space-y-2">
          {projects.trips.map((trip) => (
            <li key={trip.id}>
              <Link
                href={`/trips/${trip.id}`}
                className="block rounded-xl border border-[var(--border)] px-4 py-3 hover:bg-[var(--surface-2)]"
              >
                <p className="font-medium">
                  {trip.fromCity} → {trip.toCity}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {t("member_trips")} · {formatDate(trip.departAt)}
                </p>
              </Link>
            </li>
          ))}
          {projects.parcels.map((parcel) => (
            <li key={parcel.id}>
              <Link
                href={`/requests/${parcel.id}`}
                className="block rounded-xl border border-[var(--border)] px-4 py-3 hover:bg-[var(--surface-2)]"
              >
                <p className="font-medium">
                  {parcel.fromCity} → {parcel.toCity}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {t("member_parcels")}
                  {parcel.desiredDate ? ` · ${formatDate(parcel.desiredDate)}` : ""}
                </p>
              </Link>
            </li>
          ))}
          {projects.services.map((svc) => (
            <li key={svc.id}>
              <Link
                href={`/services/listing/${svc.id}`}
                className="block rounded-xl border border-[var(--border)] px-4 py-3 hover:bg-[var(--surface-2)]"
              >
                <p className="font-medium">{svc.title}</p>
                <p className="text-xs text-[var(--muted)]">
                  {t("member_services")}
                  {svc.city ? ` · ${svc.city}` : ""}
                </p>
              </Link>
            </li>
          ))}
          {projects.shops.map((shop) => (
            <li key={shop.id}>
              <Link
                href={`/shops/${shop.id}`}
                className="block rounded-xl border border-[var(--border)] px-4 py-3 hover:bg-[var(--surface-2)]"
              >
                <p className="font-medium">{shop.name}</p>
                <p className="text-xs text-[var(--muted)]">
                  {t("member_shops")}
                  {shop.city ? ` · ${shop.city}` : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
