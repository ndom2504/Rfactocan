"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useI18n } from "@/components/locale-provider";
import {
  COMMUNITY_POST_KINDS,
  type CommunityAttachment,
  type CommunityPostKindId,
} from "@/lib/community";
import type { DictKey } from "@/lib/i18n";

const REPORT_REASONS: { value: string; key: DictKey }[] = [
  { value: "spam", key: "community_report_reason_spam" },
  { value: "hate", key: "community_report_reason_hate" },
  { value: "illegal", key: "community_report_reason_illegal" },
  { value: "other", key: "community_report_reason_other" },
];

const kindLabelKey: Record<CommunityPostKindId, DictKey> = {
  BUSINESS: "community_kind_business",
  OPPORTUNITY: "community_kind_opportunity",
  COMMUNITY: "community_kind_community",
};

type EditablePost = {
  id: string;
  kind: CommunityPostKindId | string;
  title: string | null;
  body: string;
  attachments: CommunityAttachment[];
  isOwner: boolean;
  source?: string;
  author: { id: string };
};

type Props = {
  post: EditablePost;
  onUpdated?: (post: EditablePost & Record<string, unknown>) => void;
  onDeleted?: (id: string) => void;
};

export function CommunityPostActions({ post, onUpdated, onDeleted }: Props) {
  const { t } = useI18n();
  const isRealPost = post.source === "post" || !post.source;
  const [editing, setEditing] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [kind, setKind] = useState(String(post.kind));
  const [title, setTitle] = useState(post.title ?? "");
  const [body, setBody] = useState(post.body);
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (!isRealPost) return null;

  async function saveEdit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/community/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          title: title.trim() || null,
          body: body.trim(),
          attachments: post.attachments,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setEditing(false);
      onUpdated?.(data.post);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(t("community_delete_confirm"))) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/community/posts/${post.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur");
      }
      onDeleted?.(post.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function sendReport() {
    setBusy(true);
    setError(null);
    try {
      const reasonLabel = t(
        REPORT_REASONS.find((r) => r.value === reason)?.key ??
          "community_report_reason_other"
      );
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          communityPostId: post.id,
          reason: reasonLabel,
          details: details.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setReporting(false);
      setDetails("");
      setInfo(t("community_report_sent"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 space-y-3">
      <div className="flex flex-wrap gap-2">
        {post.isOwner && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setEditing((v) => !v);
                setReporting(false);
              }}
              className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              {t("community_edit")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void remove()}
              className="text-xs text-[var(--muted)] hover:text-red-700"
            >
              {t("community_delete")}
            </button>
          </>
        )}
        {!post.isOwner && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setReporting((v) => !v);
              setEditing(false);
            }}
            className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            {t("community_report")}
          </button>
        )}
      </div>

      {info && <p className="text-xs text-[var(--accent)]">{info}</p>}
      {error && <p className="text-xs text-red-700">{error}</p>}

      {editing && (
        <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
          <div className="flex flex-wrap gap-2">
            {COMMUNITY_POST_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  kind === k
                    ? "bg-[var(--rfacto-green)] text-white"
                    : "bg-[var(--surface)] text-[var(--muted)]"
                }`}
              >
                {t(kindLabelKey[k])}
              </button>
            ))}
          </div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 120))}
            placeholder={t("community_title_placeholder")}
          />
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 4000))}
            rows={4}
          />
          <Button disabled={busy || body.trim().length < 10} onClick={() => void saveEdit()}>
            {t("community_edit_save")}
          </Button>
        </div>
      )}

      {reporting && (
        <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
          <p className="text-sm font-medium">{t("community_report_title")}</p>
          <Label>{t("community_report_reason")}</Label>
          <Select value={reason} onChange={(e) => setReason(e.target.value)}>
            {REPORT_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {t(r.key)}
              </option>
            ))}
          </Select>
          <Label>{t("community_report_details")}</Label>
          <Textarea
            value={details}
            onChange={(e) => setDetails(e.target.value.slice(0, 2000))}
            rows={3}
          />
          <Button disabled={busy} onClick={() => void sendReport()}>
            {t("community_report_send")}
          </Button>
        </div>
      )}
    </div>
  );
}
