"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/user-avatar";
import { formatDate } from "@/lib/utils";

type Peer = {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  online?: boolean;
};

type DmMessage = {
  id: string;
  body: string;
  senderId: string;
  createdAt: string;
  attachmentUrl?: string | null;
};

export default function DirectMessageChatPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const [meId, setMeId] = useState("");
  const [peer, setPeer] = useState<Peer | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    const [meRes, msgRes] = await Promise.all([
      fetch("/api/auth/me"),
      fetch(`/api/dm/${id}/messages`),
    ]);
    const meData = await meRes.json();
    const msgData = await msgRes.json();
    if (meRes.ok) setMeId(meData.user?.id ?? "");
    if (msgRes.ok) {
      setMessages(msgData.messages ?? []);
      setPeer(msgData.peer ?? null);
      setError("");
    } else {
      setError(msgData.error || "Erreur");
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    setError("");
    const res = await fetch(`/api/dm/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text.trim() }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) {
      setError(data.error || "Erreur");
      return;
    }
    setText("");
    if (data.message) {
      setMessages((prev) => [...prev, data.message]);
    } else {
      void load();
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">{t("loading")}</p>;
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar
            name={peer?.displayName || "?"}
            avatarUrl={peer?.avatarUrl}
            size="lg"
          />
          <div className="min-w-0">
            <h1 className="truncate font-[family-name:var(--font-display)] text-xl font-semibold">
              {peer?.displayName || t("messages_title")}
            </h1>
            <p className="text-xs text-[var(--muted)]">
              {peer?.online ? t("online") : t("dm_direct_chat")}
            </p>
          </div>
        </div>
        <Link
          href="/messages"
          className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          ← {t("messages_title")}
        </Link>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="flex min-h-[50vh] flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        {messages.length === 0 && (
          <p className="text-sm text-[var(--muted)]">{t("no_messages")}</p>
        )}
        {messages.map((m) => {
          const mine = m.senderId === meId;
          return (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                mine
                  ? "ml-auto bg-[var(--accent)] text-white"
                  : "bg-[var(--surface-2)] text-[var(--foreground)]"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              <p
                className={`mt-1 text-[10px] ${
                  mine ? "text-white/70" : "text-[var(--muted)]"
                }`}
              >
                {formatDate(m.createdAt)}
              </p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={onSend} className="flex flex-col gap-2 sm:flex-row">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          maxLength={4000}
          placeholder={t("type_message")}
          className="flex-1"
        />
        <Button type="submit" disabled={sending || !text.trim()}>
          {sending ? "…" : t("send")}
        </Button>
      </form>
    </div>
  );
}
