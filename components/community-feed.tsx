"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CommunityMediaGrid } from "@/components/community-media-grid";
import { CommunityPostActions } from "@/components/community-post-actions";
import { ExpandableText } from "@/components/expandable-text";
import {
  absoluteShareUrl,
  CommunityShareButton,
} from "@/components/community-share-button";
import { communitySharePath } from "@/lib/community-share";
import { UserAvatar } from "@/components/user-avatar";
import { useI18n } from "@/components/locale-provider";
import {
  COMMUNITY_FEED_FILTERS,
  COMMUNITY_MAX_ATTACHMENTS,
  type CommunityAttachment,
  type CommunityFeedFilterId,
  type CommunityPostKindId,
} from "@/lib/community";
import { uploadCommunityAttachment } from "@/lib/community-upload-client";
import type { DictKey } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import { isNativeCommunityPostId } from "@/lib/community-source";

type FeedPost = {
  id: string;
  kind: string;
  title: string | null;
  body: string;
  attachments: CommunityAttachment[];
  createdAt: string;
  href?: string | null;
  source?: "post" | "service" | "shop" | "trip" | "parcel" | "job" | "meet";
  isOwner: boolean;
  viewCount?: number;
  commentCount?: number;
  author: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    bannerUrl?: string | null;
    bio: string | null;
    country: string | null;
    verified: boolean;
    ratingAvg: number;
    ratingCount: number;
    connectionCount?: number;
    connectedByMe?: boolean;
  };
};

const kindLabelKey: Record<string, DictKey> = {
  ANNOUNCE: "community_kind_announce",
  TRIP: "community_kind_trip",
  PARCEL: "community_kind_parcel",
  SERVICE: "community_kind_service",
  BUSINESS: "community_kind_business",
  OPPORTUNITY: "community_kind_opportunity",
  COMMUNITY: "community_kind_community",
  JOB: "community_kind_jobs",
  MEET: "community_kind_meet",
};

const ANNOUNCE_KINDS: { id: CommunityPostKindId; labelKey: DictKey }[] = [
  { id: "COMMUNITY", labelKey: "community_kind_community" },
  { id: "OPPORTUNITY", labelKey: "community_kind_opportunity" },
  { id: "BUSINESS", labelKey: "community_kind_business" },
];

export function CommunityFeed() {
  const { t } = useI18n();
  const router = useRouter();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"" | CommunityFeedFilterId>("");
  const [error, setError] = useState<string | null>(null);
  const [commentingId, setCommentingId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [kind, setKind] = useState<CommunityPostKindId>("COMMUNITY");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<CommunityAttachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("annoncer") === "1") setComposerOpen(true);
      const k = params.get("kind");
      if (
        k &&
        (COMMUNITY_FEED_FILTERS as readonly string[]).includes(k.toUpperCase())
      ) {
        setFilter(k.toUpperCase() as CommunityFeedFilterId);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = filter ? `?kind=${filter}` : "";
      const res = await fetch(`/api/community/posts${qs}`);
      const text = await res.text();
      let data: { posts?: FeedPost[]; error?: string } = {};
      try {
        data = text ? (JSON.parse(text) as { posts?: FeedPost[]; error?: string }) : {};
      } catch {
        throw new Error("Impossible de charger la communauté");
      }
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
      if (e.key === "Escape" && !busy && !uploading) setComposerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [composerOpen, busy, uploading]);

  async function onFilesSelected(files: FileList | null) {
    if (!files?.length) return;
    const remaining = COMMUNITY_MAX_ATTACHMENTS - attachments.length;
    if (remaining <= 0) {
      setError(t("community_attachments_max"));
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const next: CommunityAttachment[] = [...attachments];
      for (const file of Array.from(files).slice(0, remaining)) {
        next.push(await uploadCommunityAttachment(file));
      }
      setAttachments(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload échoué");
    } finally {
      setUploading(false);
    }
  }

  async function publish() {
    const text = body.trim();
    if (text.length < 10) {
      setError(t("community_body_placeholder"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          title: title.trim() || undefined,
          body: text,
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
      setFilter("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
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

  async function openComments(post: FeedPost) {
    if (isNativeCommunityPostId(post.id) && (post.source === "post" || !post.source)) {
      router.push(`/community/${post.id}#comments`);
      return;
    }
    setCommentingId(post.id);
    setError(null);
    try {
      const res = await fetch("/api/community/posts/ensure-source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedId: post.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.post?.id) {
        throw new Error(data.error || "Impossible d'ouvrir les commentaires");
      }
      router.push(`/community/${data.post.id}#comments`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setCommentingId(null);
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

      {composerOpen && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("community_announce_modal_title")}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl"
          >
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
              {t("community_announce_modal_title")}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {t("community_guidelines")}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {ANNOUNCE_KINDS.map((item) => (
                <FilterChip
                  key={item.id}
                  active={kind === item.id}
                  label={t(item.labelKey)}
                  onClick={() => setKind(item.id)}
                />
              ))}
            </div>
            <div className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="announce-title">{t("community_title_placeholder")}</Label>
                <Input
                  id="announce-title"
                  value={title}
                  maxLength={120}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("community_title_placeholder")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="announce-body">{t("community_body_placeholder")}</Label>
                <Textarea
                  id="announce-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={5}
                  placeholder={t("community_body_placeholder")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="announce-files">{t("community_attach")}</Label>
                <input
                  id="announce-files"
                  type="file"
                  multiple
                  className="block w-full text-sm"
                  disabled={uploading || attachments.length >= COMMUNITY_MAX_ATTACHMENTS}
                  onChange={(e) => void onFilesSelected(e.target.files)}
                />
                <p className="text-xs text-[var(--muted)]">{t("community_attach_hint")}</p>
                {attachments.length > 0 && (
                  <CommunityMediaGrid
                    attachments={attachments}
                    postId="draft"
                  />
                )}
              </div>
            </div>
            {error && (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy || uploading}
                onClick={() => setComposerOpen(false)}
              >
                {t("cancel")}
              </Button>
              <Button
                type="button"
                disabled={busy || uploading}
                onClick={() => void publish()}
              >
                {busy ? t("loading") : t("community_publish")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {!composerOpen && error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <FilterChip
          active={filter === ""}
          label={t("all")}
          onClick={() => setFilter("")}
        />
        {COMMUNITY_FEED_FILTERS.map((k) => (
          <FilterChip
            key={k}
            active={filter === k}
            label={t(kindLabelKey[k] ?? "community_kind_community")}
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
            <li key={post.id} className="overflow-hidden py-4">
              {post.author.bannerUrl ? (
                <Link href={`/member/${post.author.id}`} className="mb-3 block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.author.bannerUrl}
                    alt=""
                    className="h-28 w-full rounded-xl object-cover"
                  />
                </Link>
              ) : null}
              <div className="flex gap-3">
                <Link
                  href={`/member/${post.author.id}`}
                  className="flex shrink-0 flex-col items-center gap-1"
                >
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
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <Link
                      href={`/member/${post.author.id}`}
                      className="font-semibold hover:underline"
                    >
                      {post.author.displayName}
                    </Link>
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
              <ExpandableText text={post.body} className="mt-2" />

              {(post.attachments?.length ?? 0) > 0 && (
                <div className="mt-3 -mx-1 overflow-hidden sm:mx-0">
                  <CommunityMediaGrid
                    attachments={post.attachments}
                    postId={post.id}
                  />
                </div>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-[var(--border)] pt-2">
                {post.href ? (
                  <Link
                    href={post.href}
                    className="rounded-md bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)] hover:underline"
                  >
                    {t("community_see")}
                  </Link>
                ) : null}
                <button
                  type="button"
                  title={t("community_connect_hint")}
                  disabled={post.isOwner}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void toggleConnect(
                      post.author.id,
                      Boolean(post.author.connectedByMe)
                    );
                  }}
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
                <button
                  type="button"
                  disabled={commentingId === post.id}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void openComments(post);
                  }}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] disabled:opacity-40"
                >
                  {t("community_comment_action")}
                </button>
                <CommunityShareButton
                  url={absoluteShareUrl(communitySharePath(post.id))}
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
