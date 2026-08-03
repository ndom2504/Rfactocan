"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CommunityMediaGrid } from "@/components/community-media-grid";
import { CommunityPostActions } from "@/components/community-post-actions";
import {
  absoluteShareUrl,
  CommunityShareButton,
} from "@/components/community-share-button";
import { communitySharePath } from "@/lib/community-share";
import { UserAvatar } from "@/components/user-avatar";
import { useI18n } from "@/components/locale-provider";
import { CommunityVideoPlayer } from "@/components/community-video-player";
import {
  COMMUNITY_POST_KINDS,
  isImageAttachment,
  isVideoAttachment,
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
  viewCount?: number;
  commentCount?: number;
  author: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    bio: string | null;
    country: string | null;
    verified: boolean;
    ratingAvg: number;
    ratingCount: number;
    connectionCount?: number;
    connectedByMe?: boolean;
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
  const [composerOpen, setComposerOpen] = useState(false);

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

  useEffect(() => {
    if (!composerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeComposer();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- closeComposer is stable enough for modal lifecycle
  }, [composerOpen, busy, uploading]);

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
      setComposerOpen(false);
      setPosts((prev) => [data.post, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  function closeComposer() {
    if (busy || uploading) return;
    setComposerOpen(false);
    setError(null);
  }

  async function removePost(id: string) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  async function toggleConnect(authorId: string, currentlyConnected: boolean) {
    try {
      const res = await fetch(
        currentlyConnected
          ? `/api/connections?userId=${encodeURIComponent(authorId)}`
          : "/api/connections",
        currentlyConnected
          ? { method: "DELETE" }
          : {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: authorId }),
            }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setPosts((prev) =>
        prev.map((p) =>
          p.author.id === authorId
            ? {
                ...p,
                author: {
                  ...p.author,
                  connectedByMe: Boolean(data.connected),
                  connectionCount:
                    typeof data.connectionCount === "number"
                      ? data.connectionCount
                      : p.author.connectionCount ?? 0,
                },
              }
            : p
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="flex flex-col items-start gap-4 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-base font-medium text-[var(--foreground)] sm:text-lg">
          {t("community_announce_prompt")}
        </p>
        <Button
          type="button"
          onClick={() => {
            setError(null);
            setComposerOpen(true);
          }}
          className="w-full shrink-0 sm:w-auto"
        >
          {t("community_announce")}
        </Button>
      </section>

      {!composerOpen && error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {composerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="presentation"
          onClick={closeComposer}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("community_announce_modal_title")}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
                  {t("community_announce_modal_title")}
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {t("community_guidelines")}
                </p>
              </div>
              <button
                type="button"
                className="rounded-full px-2 py-1 text-sm text-[var(--muted)] hover:bg-[var(--surface-2)]"
                onClick={closeComposer}
                aria-label={t("close")}
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
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
                    accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime,application/pdf"
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
                <div className="grid gap-3 sm:grid-cols-3">
                  {attachments.map((a, i) => (
                    <div
                      key={`${a.url}-${i}`}
                      className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)]"
                    >
                      {isImageAttachment(a.contentType) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={a.url}
                          alt={a.name}
                          className="h-40 w-full object-cover"
                        />
                      ) : isVideoAttachment(a.contentType, a.name || a.url) ? (
                        <CommunityVideoPlayer src={a.url} compact />
                      ) : (
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-40 flex-col items-center justify-center gap-2 px-3 text-center"
                        >
                          <span className="rounded-lg bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--accent)]">
                            PDF
                          </span>
                          <span className="line-clamp-2 text-xs text-[var(--muted)]">
                            {a.name}
                          </span>
                          <span className="text-[11px] text-[var(--accent)] underline">
                            {t("community_preview_open")}
                          </span>
                        </a>
                      )}
                      <button
                        type="button"
                        className="absolute right-2 top-2 rounded-full bg-black/65 px-2 py-0.5 text-xs text-white hover:bg-black/80"
                        onClick={() =>
                          setAttachments((prev) =>
                            prev.filter((_, idx) => idx !== i)
                          )
                        }
                        aria-label={t("close")}
                      >
                        ✕
                      </button>
                      {(isImageAttachment(a.contentType) ||
                        isVideoAttachment(a.contentType, a.name || a.url)) && (
                        <p className="truncate border-t border-[var(--border)] px-2 py-1.5 text-[11px] text-[var(--muted)]">
                          {a.name}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {attachments.length > 0 && (
                <p className="text-xs text-[var(--muted)]">
                  {t("community_preview_hint")}
                </p>
              )}
              {error && (
                <p className="text-sm text-red-700" role="alert">
                  {error}
                </p>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy || uploading}
                  onClick={closeComposer}
                >
                  {t("close")}
                </Button>
                <Button
                  disabled={busy || uploading || body.trim().length < 10}
                  onClick={() => void publish()}
                >
                  {busy ? t("loading") : t("community_publish")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
            <li key={post.id} className="py-4">
              <div className="flex gap-3">
                <div className="flex shrink-0 flex-col items-center gap-1">
                  <UserAvatar
                    name={post.author.displayName}
                    avatarUrl={post.author.avatarUrl}
                    size="md"
                  />
                  <p
                    className="max-w-[4.5rem] text-center text-[10px] leading-tight text-[var(--muted)]"
                    title={t("community_connections")}
                  >
                    <span className="font-semibold text-[var(--foreground)]">
                      {post.author.connectionCount ?? 0}
                    </span>
                    <br />
                    {t("community_connections")}
                  </p>
                </div>
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
                </div>
              </div>

              {post.title && (
                <h2 className="mt-3 font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--accent)]">
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

              {(post.attachments?.length ?? 0) > 0 && (
                <div className="mt-3 -mx-1 overflow-hidden sm:mx-0">
                  <CommunityMediaGrid
                    attachments={post.attachments}
                    postId={post.id}
                  />
                </div>
              )}

              {(post.source === "post" || !post.source) && (
                <p className="mt-2 text-xs text-[var(--muted)]">
                  {post.viewCount ?? 0} {t("community_views")} ·{" "}
                  {post.commentCount ?? 0} {t("community_comments")}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-[var(--border)] pt-2">
                <button
                  type="button"
                  title={t("community_connect_hint")}
                  disabled={post.isOwner}
                  onClick={() =>
                    void toggleConnect(
                      post.author.id,
                      Boolean(post.author.connectedByMe)
                    )
                  }
                  className={`rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-40 ${
                    post.author.connectedByMe
                      ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {post.author.connectedByMe
                    ? t("community_connected")
                    : t("community_connect")}
                </button>
                <Link
                  href={
                    post.source === "post" || !post.source
                      ? `/community/${post.id}#comments`
                      : post.href || "/community"
                  }
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                >
                  {t("community_comment_action")}
                </Link>
                <Link
                  href={
                    post.source === "post" || !post.source
                      ? `/community/${post.id}`
                      : post.href || "/community"
                  }
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                >
                  {t("community_see")}
                </Link>
                <CommunityShareButton
                  url={absoluteShareUrl(
                    post.source === "post" || !post.source
                      ? communitySharePath(post.id)
                      : post.href || "/community"
                  )}
                  title={post.title}
                  body={post.body}
                />
              </div>
              <CommunityPostActions
                post={post}
                onUpdated={(updated) =>
                  setPosts((prev) =>
                    prev.map((p) =>
                      p.id === updated.id
                        ? {
                            ...p,
                            kind: updated.kind as FeedPost["kind"],
                            title: updated.title,
                            body: updated.body,
                            attachments: updated.attachments ?? p.attachments,
                          }
                        : p
                    )
                  )
                }
                onDeleted={(id) => void removePost(id)}
              />
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
