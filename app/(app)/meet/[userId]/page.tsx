"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/user-avatar";
import { useI18n } from "@/components/locale-provider";

type ViewData = {
  profile: {
    headline: string;
    bio: string | null;
    kind: "BUSINESS" | "ROMANCE";
    age: number | null;
    city: string | null;
    country: string | null;
    interests: string | null;
    photoUrl: string | null;
    photoVisible: boolean;
  };
  user: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    verified: boolean;
  };
  contactStatus: string | null;
  contactId: string | null;
  threadId: string | null;
  canContact: boolean;
};

export default function MeetPublicProfilePage() {
  const { t } = useI18n();
  const params = useParams();
  const router = useRouter();
  const userId = String(params.userId || "");
  const [data, setData] = useState<ViewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/meet/${userId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function sendContact() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/meet/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toUserId: userId,
          message: message.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur");
      if (json.threadId) {
        router.push(`/messages/dm/${json.threadId}`);
        return;
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function accept() {
    if (!data?.contactId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/meet/contact/${data.contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur");
      if (json.threadId) router.push(`/messages/dm/${json.threadId}`);
      else await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">{t("loading")}</p>;
  }
  if (!data) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-700">{error || t("meet_not_found")}</p>
        <Link href="/meet" className={buttonVariants({ variant: "outline" })}>
          {t("meet_title")}
        </Link>
      </div>
    );
  }

  const { profile, user } = data;
  const kindLabel =
    profile.kind === "BUSINESS"
      ? t("meet_kind_business")
      : t("meet_kind_romance");

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex gap-4">
        <UserAvatar
          name={user.displayName}
          avatarUrl={user.avatarUrl}
          size="lg"
        />
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            {profile.headline}
          </h1>
          <p className="text-sm text-[var(--muted)]">
            {user.displayName}
            {user.verified ? ` · ${t("verified")}` : ""}
          </p>
          <p className="mt-1 text-sm">
            {kindLabel}
            {profile.age != null ? ` · ${profile.age} ${t("meet_years")}` : ""}
            {profile.city || profile.country
              ? ` · ${[profile.city, profile.country].filter(Boolean).join(", ")}`
              : ""}
          </p>
        </div>
      </div>

      {!profile.photoVisible && !profile.photoUrl && (
        <p className="text-xs text-[var(--muted)]">{t("meet_photo_hidden")}</p>
      )}

      {profile.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.photoUrl}
          alt=""
          className="max-h-72 w-full object-cover"
        />
      )}

      {profile.bio && (
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{profile.bio}</p>
      )}
      {profile.interests && (
        <p className="text-sm">
          <span className="font-medium">{t("meet_interests")}: </span>
          {profile.interests}
        </p>
      )}

      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {data.threadId || data.contactStatus === "ACCEPTED" ? (
        <div className="space-y-2">
          <p className="text-sm text-[var(--accent)]">{t("meet_mutual_ok")}</p>
          {data.threadId ? (
            <Link href={`/messages/dm/${data.threadId}`} className={buttonVariants()}>
              {t("meet_open_chat")}
            </Link>
          ) : null}
        </div>
      ) : data.contactStatus === "SENT" ? (
        <p className="text-sm text-[var(--muted)]">{t("meet_request_sent")}</p>
      ) : data.contactStatus === "INCOMING" ? (
        <div className="space-y-2">
          <p className="text-sm">{t("meet_request_incoming")}</p>
          <Button disabled={busy} onClick={() => void accept()}>
            {t("meet_accept")}
          </Button>
        </div>
      ) : !data.canContact ? (
        <div className="space-y-2">
          <p className="text-sm text-[var(--muted)]">{t("meet_need_profile")}</p>
          <Link href="/meet" className={buttonVariants()}>
            {t("meet_create_cta")}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("meet_contact_message_ph")}
            rows={3}
            maxLength={500}
          />
          <Button disabled={busy} onClick={() => void sendContact()}>
            {busy ? t("loading") : t("meet_send_request")}
          </Button>
        </div>
      )}

      <Link href="/community" className="text-sm text-[var(--accent)] hover:underline">
        {t("community_title")}
      </Link>
    </div>
  );
}
