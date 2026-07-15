"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/user-avatar";
import { useI18n } from "@/components/locale-provider";
import { cn } from "@/lib/utils";

export type ChatMessage = {
  id: string;
  body: string;
  attachmentUrl: string | null;
  createdAt: string;
  readAt?: string | null;
  senderId: string;
  sender: {
    displayName: string;
    avatarUrl?: string | null;
    lastSeenAt?: string | null;
  };
};

type Peer = {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  lastSeenAt?: string | null;
  online: boolean;
};

type Props = {
  bookingId: string;
  meId: string;
  closed?: boolean;
  className?: string;
};

function formatMessageTime(iso: string, locale: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  return new Intl.DateTimeFormat(locale === "en" ? "en-CA" : "fr-CA", {
    ...(sameDay
      ? { hour: "2-digit", minute: "2-digit" }
      : { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
  }).format(d);
}

function isImageUrl(url: string) {
  if (/\.(jpe?g|png|gif|webp)(\?|$)/i.test(url)) return true;
  if (url.includes("/api/media")) return true;
  if (url.includes("blob.vercel-storage.com")) return true;
  return false;
}

function isAttachmentOnlyBody(body: string) {
  return body === "Pièce jointe" || body === "Attachment";
}

export function BookingChat({ bookingId, meId, closed, className }: Props) {
  const { t, locale } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [peer, setPeer] = useState<Peer | null>(null);
  const [body, setBody] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  async function loadMessages() {
    const res = await fetch(`/api/bookings/${bookingId}/messages`);
    const data = await res.json();
    if (res.ok) {
      setMessages(data.messages ?? []);
      if (data.peer) setPeer(data.peer);
    }
  }

  useEffect(() => {
    void loadMessages();
    const interval = setInterval(() => void loadMessages(), 4000);
    return () => clearInterval(interval);
  }, [bookingId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (!pendingFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  function clearAttachment() {
    setPendingFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function uploadFile(file: File): Promise<string | null> {
    setUploading(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) {
      setError(data.error ?? t("attach_failed"));
      return null;
    }
    return data.url as string;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (closed || sending || uploading) return;
    const text = body.trim();
    if (!text && !pendingFile) return;

    setSending(true);
    setError("");
    let attachmentUrl: string | null = null;
    if (pendingFile) {
      attachmentUrl = await uploadFile(pendingFile);
      if (!attachmentUrl) {
        setSending(false);
        return;
      }
    }

    const res = await fetch(`/api/bookings/${bookingId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: text || undefined,
        attachmentUrl,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) {
      setError(data.error ?? "Erreur");
      return;
    }
    setBody("");
    clearAttachment();
    if (data.message) {
      setMessages((prev) => [...prev, data.message]);
    } else {
      await loadMessages();
    }
  }

  return (
    <Card className={cn("flex min-h-[480px] flex-col", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <CardTitle>{t("messaging")}</CardTitle>
          <CardDescription>{t("messaging_hint")}</CardDescription>
        </div>
        {peer && (
          <div className="flex items-center gap-2">
            <UserAvatar
              name={peer.displayName}
              avatarUrl={peer.avatarUrl}
              size="sm"
              online={peer.online}
            />
            <div className="text-right">
              <p className="text-sm font-medium leading-tight">
                {peer.displayName}
              </p>
              <p
                className={cn(
                  "text-[11px]",
                  peer.online ? "text-emerald-600" : "text-[var(--muted)]"
                )}
              >
                {peer.online ? t("status_online") : t("status_offline")}
              </p>
            </div>
          </div>
        )}
      </div>

      <div
        ref={listRef}
        className="mt-4 flex-1 space-y-3 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 p-3"
      >
        {messages.map((m) => {
          const mine = m.senderId === meId;
          return (
            <div
              key={m.id}
              className={cn(
                "flex gap-2",
                mine ? "flex-row-reverse" : "flex-row"
              )}
            >
              <UserAvatar
                name={m.sender.displayName}
                avatarUrl={m.sender.avatarUrl}
                size="sm"
                online={mine ? true : peer?.online}
              />
              <div
                className={cn(
                  "max-w-[78%] space-y-1",
                  mine ? "items-end" : "items-start"
                )}
              >
                <div
                  className={cn(
                    "rounded-2xl px-3 py-2 text-sm shadow-sm",
                    mine
                      ? "rounded-br-md bg-[var(--accent)] text-white"
                      : "rounded-bl-md border border-[var(--border)] bg-[var(--surface)]"
                  )}
                >
                  {!mine && (
                    <p className="mb-0.5 text-[11px] font-medium opacity-70">
                      {m.sender.displayName}
                    </p>
                  )}
                  {m.attachmentUrl && (
                    <div className="mb-2 space-y-2">
                      <a
                        href={m.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block overflow-hidden rounded-lg"
                      >
                        {isImageUrl(m.attachmentUrl) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.attachmentUrl}
                            alt={t("attachment_label")}
                            className="max-h-48 w-full object-cover"
                          />
                        ) : (
                          <span className="underline">{t("open_attachment")}</span>
                        )}
                      </a>
                      <a
                        href={m.attachmentUrl}
                        download
                        className={cn(
                          "inline-flex text-xs font-medium underline",
                          mine ? "text-white/90" : "text-[var(--accent)]"
                        )}
                      >
                        {t("download_attachment")}
                      </a>
                    </div>
                  )}
                  {m.body && !isAttachmentOnlyBody(m.body) && (
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  )}
                </div>
                <p
                  className={cn(
                    "px-1 text-[10px] text-[var(--muted)]",
                    mine ? "text-right" : "text-left"
                  )}
                >
                  {formatMessageTime(m.createdAt, locale)}
                  {mine && (
                    <>
                      {" · "}
                      <span
                        className={
                          m.readAt ? "text-emerald-600" : "text-[var(--muted)]"
                        }
                      >
                        {m.readAt ? t("message_read") : t("message_delivered")}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-[var(--muted)]">
            {t("no_messages")}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {closed ? (
        <p className="mt-4 text-sm text-[var(--muted)]">{t("chat_closed")}</p>
      ) : (
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          {previewUrl && (
            <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt=""
                className="h-14 w-14 rounded object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{pendingFile?.name}</p>
                <p className="text-xs text-[var(--muted)]">
                  {t("attachment_ready")}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearAttachment}
              >
                {t("remove_photo")}
              </Button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setPendingFile(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              title={t("attach_file")}
              disabled={sending || uploading}
              onClick={() => fileRef.current?.click()}
              aria-label={t("attach_file")}
            >
              <span className="text-lg leading-none">+</span>
            </Button>
            <Input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t("your_message")}
              disabled={sending || uploading}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={
                sending || uploading || (!body.trim() && !pendingFile)
              }
            >
              {uploading
                ? t("uploading")
                : sending
                  ? t("loading")
                  : t("send")}
            </Button>
          </div>
          <p className="text-xs text-[var(--muted)]">{t("attach_hint")}</p>
          {error && <p className="text-sm text-red-700">{error}</p>}
        </form>
      )}
    </Card>
  );
}
