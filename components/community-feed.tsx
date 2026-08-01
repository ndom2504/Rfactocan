"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { useI18n } from "@/components/locale-provider";
import {
  COMMUNITY_POST_KINDS,
  isImageAttachment,
  type CommunityAttachment,
  type CommunityPostKindId,
} from "@/lib/community";
import type { DictKey } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

type FeedPost = {
  id: string;
  kind: CommunityPostKindId;
  title: string | null;
  body: string;
  attachments: CommunityAttachment[];
  createdAt: string;
  href?: string | null;
  source?: "post" | "service" | "shop" | "trip";
  isOwner: boolean;
  author: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    bio: string | null;
    country: string | null;
    verified: boolean;
    ratingAvg: number;
    ratingCount: number;
  };
};

const kindLabelKey: Record<CommunityPostKindId, DictKey> = {
  BUSINESS: "community_kind_business",
  OPPORTUNITY: "community_kind_opportunity",
  COMMUNITY: "community_kind_community",
};

export function CommunityFeed() {
  const { t } = useI18n();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"" | CommunityPostKindId>("");
  const [kind, setKind] = useState<CommunityPostKindId>("BUSINESS");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<CommunityAttachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = filter ? `?kind=${filter}` : "";
      const res = await fetch(`/api/community/posts${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setPosts(data.posts ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onFilesSelected(files: FileList | null) {
    if (!files?.length) return;
    const remaining = 3 - attachments.length;
    if (remaining <= 0) {
      setError(t("community_attachments_max"));
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const next: CommunityAttachment[] = [...attachments];
      for (const file of Array.from(files).slice(0, remaining)) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/community/upload", {
          method: "POST",
          body: form,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload échoué");
        next.push({
          url: data.url,
          name: data.name,
          contentType: data.contentType,
          size: data.size,
        });
      }
      setAttachments(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload échoué");
    } finally {
      setUploading(false);
    }
  }

  async function publish() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          title: title.trim() || undefined,
          body: body.trim(),
          attachments,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Publication impossible");
      setTitle("");
      setBody("");
      setAttachments([]);
      setPosts((prev) => [data.post, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function removePost(id: string) {
    if (!confirm(t("community_delete_confirm"))) return;
    const res = await fetch(`/api/community/posts/${id}`, { method: "DELETE" });
    if (res.ok) setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="border-b border-[var(--border)] pb-6">
        <p className="text-sm text-[var(--muted)]">{t("community_guidelines")}</p>
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {COMMUNITY_POST_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  kind === k
                    ? "bg-[var(--rfacto-green)] text-white"
                    : "bg-[var(--surface-2)] text-[var(--foreground)] hover:bg-[var(--surface-3)]"
                }`}
              >
                {t(kindLabelKey[k])}
              </button>
            ))}
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder={t("community_title_placeholder")}
            className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            maxLength={4000}
            placeholder={t("community_body_placeholder")}
            className="w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer text-sm font-medium text-[var(--accent)]">
              {uploading ? t("loading") : t("community_attach")}
              <input
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                multiple
                disabled={uploading || attachments.length >= 3}
                onChange={(e) => {
                  void onFilesSelected(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
            <span className="text-xs text-[var(--muted)]">
              {t("community_attach_hint")}
            </span>
          </div>
          {attachments.length > 0 && (
            <ul className="space-y-1 text-sm">
              {attachments.map((a, i) => (
                <li
                  key={`${a.url}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-lg bg-[var(--surface-2)] px-3 py-2"
                >
                  <span className="truncate">{a.name}</span>
                  <button
                    type="button"
                    className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
                    onClick={() =>
                      setAttachments((prev) => prev.filter((_, idx) => idx !== i))
                    }
                  >
                    {t("close")}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {error && (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
          <Button
            disabled={busy || uploading || body.trim().length < 10}
            onClick={() => void publish()}
            className="w-full sm:w-auto"
          >
            {busy ? t("loading") : t("community_publish")}
          </Button>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <FilterChip
          active={filter === ""}
          label={t("all")}
          onClick={() => setFilter("")}
        />
        {COMMUNITY_POST_KINDS.map((k) => (
          <FilterChip
            key={k}
            active={filter === k}
            label={t(kindLabelKey[k])}
            onClick={() => setFilter(k)}
          />
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-[var(--muted)]">{t("loading")}</p>
      ) : posts.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">{t("community_empty")}</p>
      ) : (
        <ul className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
          {posts.map((post) => (
            <li key={post.id} className="py-5">
              <div className="flex gap-3">
                <UserAvatar
                  name={post.author.displayName}
                  avatarUrl={post.author.avatarUrl}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="font-semibold">{post.author.displayName}</span>
                    {post.author.verified && (
                      <span className="text-xs font-medium text-[var(--accent)]">
                        {t("verified")}
                      </span>
                    )}
                    <span className="text-xs text-[var(--muted)]">
                      {t(
                        kindLabelKey[post.kind] ?? "community_kind_community"
                      )}{" "}
                      · {formatDate(post.createdAt)}
                    </span>
                  </div>
                  {post.author.bio && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-[var(--muted)]">
                      {post.author.bio}
                    </p>
                  )}
                  {post.title && (
                    <h2 className="mt-2 font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--accent)]">
                      {post.href ? (
                        <Link href={post.href} className="hover:underline">
                          {post.title}
                        </Link>
                      ) : (
                        post.title
                      )}
                    </h2>
                  )}
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                    {post.body}
                  </p>
                  {post.href && (
                    <Link
                      href={post.href}
                      className="mt-2 inline-block text-sm font-medium text-[var(--accent)] hover:underline"
                    >
                      {t("open")}
                    </Link>
                  )}
                  {(post.attachments?.length ?? 0) > 0 && (
                    <div className="mt-3 space-y-2">
                      {post.attachments.map((a, i) =>
                        isImageAttachment(a.contentType) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={`${post.id}-a-${i}`}
                            src={a.url}
                            alt={a.name}
                            className="max-h-80 w-full rounded-lg object-cover"
                          />
                        ) : (
                          <a
                            key={`${post.id}-a-${i}`}
                            href={a.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--accent)] hover:bg-[var(--surface-2)]"
                          >
                            PDF · {a.name}
                          </a>
                        )
                      )}
                    </div>
                  )}
                  {post.isOwner &&
                    (post.source === "post" || !post.source) && (
                    <button
                      type="button"
                      onClick={() => void removePost(post.id)}
                      className="mt-3 text-xs text-[var(--muted)] hover:text-red-700"
                    >
                      {t("community_delete")}
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        active
          ? "bg-[var(--rfacto-green)] text-white"
          : "bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--foreground)]"
      }`}
    >
      {label}
    </button>
  );
}
