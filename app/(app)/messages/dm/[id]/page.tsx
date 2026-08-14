"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/user-avatar";
import { LinkedText } from "@/components/linked-text";
import { cn, formatDate } from "@/lib/utils";
import { loadUserIntent } from "@/lib/user-intent";
import { formatMoneyFromCents } from "@/lib/currency";

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
  contextType?: string | null;
  contextId?: string | null;
};

type Thread = {
  id: string;
  lastContextType?: string | null;
  lastContextId?: string | null;
};

type ThreadPayment = {
  id: string;
  title: string;
  amountCents: number;
  currency: string;
  status: string;
  clientId: string;
  providerId: string;
};

function isImageUrl(url: string) {
  if (/\.(jpe?g|png|gif|webp)(\?|$)/i.test(url)) return true;
  if (url.includes("/api/media")) return true;
  if (url.includes("blob.vercel-storage.com")) return true;
  return false;
}

function isAttachmentOnlyBody(body: string) {
  return (
    body === "Pièce jointe" ||
    body === "Attachment" ||
    body === "📎"
  );
}

export default function DirectMessageChatPage() {
  const params = useParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { t } = useI18n();
  const [meId, setMeId] = useState("");
  const [peer, setPeer] = useState<Peer | null>(null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [invoices, setInvoices] = useState<ThreadPayment[]>([]);
  const [payOk, setPayOk] = useState("");
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [text, setText] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPayForm, setShowPayForm] = useState(false);
  const [payTitle, setPayTitle] = useState("");
  const [payDescription, setPayDescription] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payReceiver, setPayReceiver] = useState("");
  const [payBusy, setPayBusy] = useState(false);
  const [listingIdForPay, setListingIdForPay] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    if (!id) return;
    const [meRes, msgRes, payRes] = await Promise.all([
      fetch("/api/auth/me"),
      fetch(`/api/dm/${id}/messages`),
      fetch(`/api/service-payments?threadId=${encodeURIComponent(id)}`),
    ]);
    const meData = await meRes.json();
    const msgData = await msgRes.json();
    if (meRes.ok) setMeId(meData.user?.id ?? "");
    if (msgRes.ok) {
      setMessages(msgData.messages ?? []);
      setPeer(msgData.peer ?? null);
      setThread(msgData.thread ?? null);
      setError("");
    } else {
      setError(msgData.error || "Erreur");
    }
    if (payRes.ok) {
      const payData = await payRes.json();
      setInvoices(payData.payments ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
    const prefs = loadUserIntent();
    if (prefs.payoutIdentifier) setPayReceiver(prefs.payoutIdentifier);
    const timer = setInterval(() => void load(), 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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

  useEffect(() => {
    setListingIdForPay(null);
    if (thread?.lastContextType === "SERVICE" && thread.lastContextId) {
      fetch(`/api/services/${thread.lastContextId}`)
        .then(async (res) => {
          if (!res.ok) return;
          const data = await res.json();
          const listing = data.listing;
          if (!listing) return;
          setListingIdForPay(listing.id);
          setPayTitle((prev) => prev || listing.title || "");
          if (listing.priceAmount != null) {
            setPayAmount((prev) => prev || String(listing.priceAmount));
          }
        })
        .catch(() => {});
    }
  }, [thread?.lastContextType, thread?.lastContextId]);

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

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (sending || uploading) return;
    const bodyText = text.trim();
    if (!bodyText && !pendingFile) return;

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

    const res = await fetch(`/api/dm/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: bodyText || undefined,
        attachmentUrl,
      }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) {
      setError(data.error || "Erreur");
      return;
    }
    setText("");
    clearAttachment();
    if (data.message) {
      setMessages((prev) => [...prev, data.message]);
    } else {
      void load();
    }
  }

  async function onRequestPayment(e: FormEvent) {
    e.preventDefault();
    if (!peer || payBusy) return;
    setPayBusy(true);
    setError("");
    const amount = Number(payAmount.replace(",", "."));
    if (!payTitle.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError(t("svc_pay_need_service_price"));
      setPayBusy(false);
      return;
    }
    const res = await fetch("/api/service-payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: peer.id,
        threadId: id,
        listingId: listingIdForPay || undefined,
        title: payTitle.trim(),
        description: payDescription.trim(),
        amount,
        receiverHint: payReceiver.trim() || undefined,
      }),
    });
    const data = await res.json();
    setPayBusy(false);
    if (!res.ok) {
      setError(data.error || "Erreur");
      return;
    }
    setShowPayForm(false);
    setPayDescription("");
    setPayOk(t("svc_pay_sent_ok"));
    void load();
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

      {peer && meId && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPayForm((v) => !v)}
          >
            {showPayForm ? t("cancel") : t("svc_pay_request")}
          </Button>
        </div>
      )}

      {showPayForm && peer && (
        <form
          onSubmit={onRequestPayment}
          className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
        >
          <p className="text-sm font-medium">{t("svc_pay_request")}</p>
          <p className="text-xs text-[var(--muted)]">{t("svc_pay_request_hint")}</p>
          <div className="space-y-1.5">
            <Label htmlFor="pay-title">{t("svc_pay_service_name")}</Label>
            <Input
              id="pay-title"
              value={payTitle}
              onChange={(e) => setPayTitle(e.target.value)}
              required
              minLength={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pay-amount">{t("svc_pay_amount")}</Label>
            <Input
              id="pay-amount"
              type="number"
              step="0.01"
              min="1"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              required
              placeholder="50.00"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pay-desc">{t("description")}</Label>
            <Textarea
              id="pay-desc"
              value={payDescription}
              onChange={(e) => setPayDescription(e.target.value)}
              rows={2}
              maxLength={2000}
              placeholder={t("svc_pay_desc_placeholder")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pay-receiver">{t("svc_pay_receiver_hint")}</Label>
            <Input
              id="pay-receiver"
              value={payReceiver}
              onChange={(e) => setPayReceiver(e.target.value)}
              placeholder={t("svc_pay_receiver_placeholder")}
            />
          </div>
          <Button type="submit" disabled={payBusy}>
            {payBusy ? t("loading") : t("svc_pay_send_request")}
          </Button>
        </form>
      )}

      {payOk && <p className="text-sm text-emerald-700">{payOk}</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}

      {invoices.length > 0 && (
        <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-sm font-medium">{t("svc_pay_in_chat")}</p>
          {invoices.map((p) => {
            const iPay = p.clientId === meId;
            const statusKey =
              p.status === "AWAITING_PAYMENT"
                ? "svc_pay_status_AWAITING_PAYMENT"
                : p.status === "AWAITING_CONFIRMATION"
                  ? "svc_pay_status_AWAITING_CONFIRMATION"
                  : p.status === "PAID"
                    ? "svc_pay_status_PAID"
                    : p.status === "CANCELLED"
                      ? "svc_pay_status_CANCELLED"
                      : p.status === "EXPIRED"
                        ? "svc_pay_status_EXPIRED"
                        : null;
            return (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
              >
                <div className="min-w-0 text-sm">
                  <p className="font-medium">{p.title}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {iPay ? t("svc_pay_you_pay") : t("svc_pay_you_receive")}
                    {" · "}
                    {formatMoneyFromCents(p.amountCents, p.currency)}
                    {statusKey ? ` · ${t(statusKey)}` : ""}
                  </p>
                </div>
                <Link
                  href={`/service-payments/${p.id}`}
                  className="text-xs font-semibold text-[var(--accent)] underline"
                >
                  {t("svc_pay_open")}
                </Link>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex min-h-[50vh] flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        {messages.length === 0 && (
          <p className="text-sm text-[var(--muted)]">{t("no_messages")}</p>
        )}
        {messages.map((m) => {
          const mine = m.senderId === meId;
          const paymentId =
            m.body.match(/\/service-payments\/([a-zA-Z0-9_-]+)/)?.[1] ??
            (m.contextType === "SERVICE" &&
            m.contextId &&
            /demande de paiement|payment request/i.test(m.body)
              ? m.contextId
              : null);
          const paymentLink = paymentId
            ? `/service-payments/${paymentId}`
            : null;
          return (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                mine
                  ? "ml-auto bg-[var(--accent)] text-white"
                  : "bg-[var(--surface-2)] text-[var(--foreground)]"
              }`}
            >
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
                <p className="whitespace-pre-wrap break-words">
                  <LinkedText
                    text={m.body}
                    linkClassName={
                      mine
                        ? "break-all font-medium text-white underline underline-offset-2"
                        : undefined
                    }
                  />
                </p>
              )}
              {paymentLink && (
                <Link
                  href={paymentLink}
                  className={`mt-2 inline-block text-xs font-semibold underline ${
                    mine ? "text-white" : "text-[var(--accent)]"
                  }`}
                >
                  {t("svc_pay_open")}
                </Link>
              )}
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

      <form onSubmit={onSend} className="space-y-3">
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
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
            className="shrink-0"
          >
            <span className="text-lg leading-none">+</span>
          </Button>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            maxLength={4000}
            placeholder={t("type_message")}
            disabled={sending || uploading}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={
              sending || uploading || (!text.trim() && !pendingFile)
            }
            className="shrink-0"
          >
            {uploading
              ? t("uploading")
              : sending
                ? t("loading")
                : t("send")}
          </Button>
        </div>
        <p className="text-xs text-[var(--muted)]">{t("attach_hint")}</p>
      </form>
    </div>
  );
}
