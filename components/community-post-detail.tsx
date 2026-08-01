"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CommunityMediaGrid } from "@/components/community-media-grid";
import { UserAvatar } from "@/components/user-avatar";
import { useI18n } from "@/components/locale-provider";
import type { CommunityAttachment } from "@/lib/community";
import type { DictKey } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

type Author = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  bio?: string | null;
  verified?: boolean;
  connectionCount?: number;
  connectedByMe?: boolean;
};

type Post = {
  id: string;
  kind: string;
  title: string | null;
  body: string;
  attachments: CommunityAttachment[];
  createdAt: string;
  viewCount: number;
  commentCount: number;
  isOwner: boolean;
  author: Author;
};

type Comment = {
  id: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  isOwner: boolean;
  author: Author;
};

const kindLabelKey: Record<string, DictKey> = {
  BUSINESS: "community_kind_business",
  OPPORTUNITY: "community_kind_opportunity",
  COMMUNITY: "community_kind_community",
};

export function CommunityPostDetail() {
  const { t } = useI18n();
  const params = useParams();
  const id = String(params.id ?? "");
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [postRes, commentsRes] = await Promise.all([
        fetch(`/api/community/posts/${id}`),
        fetch(`/api/community/posts/${id}/comments`),
      ]);
      const postData = await postRes.json();
      const commentsData = await commentsRes.json();
      if (!postRes.ok) throw new Error(postData.error || "Erreur");
      setPost(postData.post);
      setComments(commentsData.comments ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) void load();
  }, [id, load]);

  async function toggleConnect() {
    if (!post || post.isOwner) return;
    const currently = Boolean(post.author.connectedByMe);
    const res = await fetch(
      currently
        ? `/api/connections?userId=${encodeURIComponent(post.author.id)}`
        : "/api/connections",
      currently
        ? { method: "DELETE" }
        : {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: post.author.id }),
          }
    );
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Erreur");
      return;
    }
    setPost((p) =>
      p
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
    );
  }

  const roots = useMemo(
    () => comments.filter((c) => !c.parentId),
    [comments]
  );
  const repliesByParent = useMemo(() => {
    const map = new Map<string, Comment[]>();
    for (const c of comments) {
      if (!c.parentId) continue;
      const list = map.get(c.parentId) ?? [];
      list.push(c);
      map.set(c.parentId, list);
    }
    return map;
  }, [comments]);

  async function submitComment() {
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/community/posts/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim(), parentId: replyTo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setBody("");
      setReplyTo(null);
      setComments((prev) => [...prev, data.comment]);
      setPost((p) =>
        p ? { ...p, commentCount: (p.commentCount ?? 0) + 1 } : p
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">{t("loading")}</p>;
  }
  if (error && !post) {
    return <p className="text-sm text-red-700">{error}</p>;
  }
  if (!post) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/community"
        className="text-sm text-[var(--accent)] hover:underline"
      >
        ← {t("community_title")}
      </Link>

      <article className="space-y-3 border-b border-[var(--border)] pb-6">
        <div className="flex gap-3">
          <div className="flex shrink-0 flex-col items-center gap-1">
            <UserAvatar
              name={post.author.displayName}
              avatarUrl={post.author.avatarUrl}
              size="md"
            />
            <p className="max-w-[4.5rem] text-center text-[10px] leading-tight text-[var(--muted)]">
              <span className="font-semibold text-[var(--foreground)]">
                {post.author.connectionCount ?? 0}
              </span>
              <br />
              {t("community_connections")}
            </p>
          </div>
          <div>
            <p className="font-semibold">{post.author.displayName}</p>
            <p className="text-xs text-[var(--muted)]">
              {t(kindLabelKey[post.kind] ?? "community_kind_community")} ·{" "}
              {formatDate(post.createdAt)}
            </p>
          </div>
        </div>
        {post.title && (
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--accent)]">
            {post.title}
          </h1>
        )}
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.body}</p>
        {(post.attachments?.length ?? 0) > 0 && (
          <CommunityMediaGrid
            attachments={post.attachments}
            postId={post.id}
          />
        )}
        <p className="text-xs text-[var(--muted)]">
          {post.viewCount} {t("community_views")} · {post.commentCount}{" "}
          {t("community_comments")}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            title={t("community_connect_hint")}
            disabled={post.isOwner}
            onClick={() => void toggleConnect()}
            className={`rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-40 ${
              post.author.connectedByMe
                ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                : "bg-[var(--surface-2)]"
            }`}
          >
            {post.author.connectedByMe
              ? t("community_connected")
              : t("community_connect")}
          </button>
          <a
            href="#comments"
            className="rounded-md bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium"
          >
            {t("community_comment_action")}
          </a>
        </div>
      </article>

      <section id="comments" className="space-y-4 scroll-mt-24">
        <h2 className="text-lg font-semibold">{t("community_comments")}</h2>
        <div className="space-y-2">
          {replyTo && (
            <p className="text-xs text-[var(--muted)]">
              {t("community_replying")}{" "}
              <button
                type="button"
                className="underline"
                onClick={() => setReplyTo(null)}
              >
                {t("cancel")}
              </button>
            </p>
          )}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder={
              replyTo
                ? t("community_reply_placeholder")
                : t("community_comment_placeholder")
            }
            className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
          <Button
            disabled={busy || body.trim().length < 1}
            onClick={() => void submitComment()}
          >
            {busy ? t("loading") : t("community_comment_send")}
          </Button>
          {error && <p className="text-sm text-red-700">{error}</p>}
        </div>

        {roots.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">{t("community_comments_empty")}</p>
        ) : (
          <ul className="space-y-4">
            {roots.map((c) => (
              <li key={c.id} className="rounded-xl border border-[var(--border)] p-3">
                <div className="flex gap-2">
                  <UserAvatar
                    name={c.author.displayName}
                    avatarUrl={c.author.avatarUrl}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{c.author.displayName}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {formatDate(c.createdAt)}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{c.body}</p>
                    <button
                      type="button"
                      className="mt-2 text-xs font-medium text-[var(--accent)]"
                      onClick={() => setReplyTo(c.id)}
                    >
                      {t("community_reply")}
                    </button>
                    {(repliesByParent.get(c.id) ?? []).length > 0 && (
                      <ul className="mt-3 space-y-3 border-l-2 border-[var(--border)] pl-3">
                        {(repliesByParent.get(c.id) ?? []).map((r) => (
                          <li key={r.id} className="flex gap-2">
                            <UserAvatar
                              name={r.author.displayName}
                              avatarUrl={r.author.avatarUrl}
                              size="sm"
                            />
                            <div>
                              <p className="text-sm font-semibold">
                                {r.author.displayName}
                              </p>
                              <p className="text-xs text-[var(--muted)]">
                                {formatDate(r.createdAt)}
                              </p>
                              <p className="mt-1 whitespace-pre-wrap text-sm">
                                {r.body}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
