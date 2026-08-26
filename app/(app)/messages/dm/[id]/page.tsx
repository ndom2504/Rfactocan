"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/user-avatar";
import { LinkedText } from "@/components/linked-text";
import { cn, formatDate } from "@/lib/utils";
import { formatMoneyFromCents } from "@/lib/currency";
import { COMMUNITY_MAX_ATTACHMENTS, isAudioAttachment } from "@/lib/community";
import { VIDEO_CALLS_ENABLED } from "@/lib/call-rules";
import { uploadCommunityAttachment } from "@/lib/community-upload-client";
import { VoiceNoteButton } from "@/components/voice-note-button";
import { VoiceNoteBubble } from "@/components/voice-note-bubble";
import {
  ReactionChips,
  ReactionPicker,
  useMessageLongPress,
} from "@/components/dm-message-reactions";
import { toggleReactionSummaries, type ReactionSummary } from "@/lib/dm-reactions";
import { dmForwardPayload, shareDirectMessageContent } from "@/lib/dm-share";
import {
  SERVICE_PROCESSING_DAYS,
  servicePaymentStatusI18nKey,
} from "@/lib/service-payment-status";
import { Select } from "@/components/ui/select";
import { useCallActions } from "@/components/call-provider";

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
  reactions?: ReactionSummary[];
};

type Thread = {
  id: string;
  channel?: string | null;
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
  escrowUntilConfirm?: boolean;
};

type ForwardThread = {
  id: string;
  peer?: {
    id?: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  } | null;
};

function isVoiceMessage(url?: string | null, body?: string | null) {
  const text = (body || "").trim();
  if (text === "Note vocale" || text === "Voice note") return true;
  return Boolean(url && isAudioAttachment("", url));
}

function isImageUrl(url: string) {
  if (isAudioAttachment("", url)) return false;
  const hay = decodeURIComponent(url);
  return /\.(jpe?g|png|gif|webp)(\?|#|$)/i.test(hay);
}

function isAttachmentOnlyBody(body: string) {
  return (
    body === "Pièce jointe" ||
    body === "Attachment" ||
    body === "📎" ||
    body === "Note vocale" ||
    body === "Voice note"
  );
}

export default function DirectMessageChatPage() {
  const params = useParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const pathname = usePathname();
  const router = useRouter();
  const inRoute = Boolean(pathname?.startsWith("/in/chat"));
  const { t } = useI18n();
  const { startOutgoing } = useCallActions();
  const [meId, setMeId] = useState("");
  const [peer, setPeer] = useState<Peer | null>(null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [invoices, setInvoices] = useState<ThreadPayment[]>([]);
  const [canInvoice, setCanInvoice] = useState(false);
  const [payOk, setPayOk] = useState("");
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [text, setText] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPayForm, setShowPayForm] = useState(false);
  const [payTitle, setPayTitle] = useState("");
  const [payDescription, setPayDescription] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payProcessingDays, setPayProcessingDays] = useState("3");
  const [payBusy, setPayBusy] = useState(false);
  const [listingIdForPay, setListingIdForPay] = useState<string | null>(null);
  const [calling, setCalling] = useState(false);
  const [reactingToId, setReactingToId] = useState<string | null>(null);
  const [forwardMessage, setForwardMessage] = useState<DmMessage | null>(null);
  const [forwardThreads, setForwardThreads] = useState<ForwardThread[]>([]);
  const [forwardLoading, setForwardLoading] = useState(false);
  const [forwardBusyId, setForwardBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadMessages() {
    if (!id) return;
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
      setThread(msgData.thread ?? null);
      setCanInvoice(
        Boolean(msgData.canInvoice) && msgData.thread?.channel !== "IN"
      );
      if (msgData.thread?.channel === "IN") setInvoices([]);
      setError("");
    } else {
      setError(msgData.error || "Erreur");
    }
    setLoading(false);
  }

  async function loadInvoices() {
    if (!id) return;
    try {
      const payRes = await fetch(
        `/api/service-payments?threadId=${encodeURIComponent(id)}`
      );
      if (!payRes.ok) return;
      const payData = await payRes.json();
      setInvoices(payData.payments ?? []);
    } catch {
      /* ignore — chat must keep working */
    }
  }

  async function load() {
    await Promise.all([loadMessages(), loadInvoices()]);
  }

  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      void loadMessages();
      void loadInvoices();
    }, 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!id || !thread?.channel) return;
    if (thread.channel === "IN" && !inRoute) {
      router.replace(`/in/chat/${id}`);
    } else if (thread.channel !== "IN" && inRoute) {
      router.replace(`/messages/dm/${id}`);
    }
  }, [id, thread?.channel, inRoute, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function startCall(mediaType: "AUDIO" | "VIDEO") {
    if (!id || calling) return;
    setCalling(true);
    setError("");
    try {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: id, mediaType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("call_failed"));
      } else if (data.call) {
        startOutgoing({
          ...data.call,
          direction: "outbound",
          peer: peer
            ? { displayName: peer.displayName, avatarUrl: peer.avatarUrl }
            : data.call.peer,
        });
      }
    } catch {
      setError(t("call_failed"));
    } finally {
      setCalling(false);
    }
  }

  async function reactToMessage(messageId: string, emoji: string | null) {
    if (!id || !emoji) return;
    setReactingToId(null);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, reactions: toggleReactionSummaries(m.reactions ?? [], emoji) }
          : m
      )
    );
    try {
      const res = await fetch(`/api/dm/${id}/messages/${messageId}/reaction`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || t("react_failed"));
        await loadMessages();
        return;
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, reactions: data.reactions ?? [] } : m
        )
      );
    } catch {
      setError(t("react_failed"));
      await loadMessages();
    }
  }

  async function shareMessage(message: DmMessage) {
    setReactingToId(null);
    setError("");
    setNotice("");
    const result = await shareDirectMessageContent({
      body: message.body,
      attachmentUrl: message.attachmentUrl,
    });
    if (result === "failed") setError(t("dm_share_failed"));
    else if (result === "downloaded") setNotice(t("dm_share_downloaded"));
    else if (result === "copied") setNotice(t("dm_share_copied"));
  }

  async function openForward(message: DmMessage) {
    setReactingToId(null);
    setForwardMessage(message);
    setForwardLoading(true);
    setForwardThreads([]);
    setError("");
    try {
      const res = await fetch(
        inRoute || thread?.channel === "IN" ? "/api/dm?scope=in" : "/api/dm"
      );
      const data = await res.json().catch(() => ({}));
      const threads = (data.threads ?? []) as ForwardThread[];
      setForwardThreads(threads.filter((thread) => thread.id !== id));
    } catch {
      setError(t("dm_forward_failed"));
      setForwardMessage(null);
    } finally {
      setForwardLoading(false);
    }
  }

  async function sendForward(targetId: string) {
    if (!forwardMessage || forwardBusyId) return;
    const payload = dmForwardPayload({
      body: forwardMessage.body,
      attachmentUrl: forwardMessage.attachmentUrl,
    });
    if (!payload) {
      setError(t("dm_forward_failed"));
      return;
    }
    setForwardBusyId(targetId);
    setError("");
    try {
      const res = await fetch(`/api/dm/${targetId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || t("dm_forward_failed"));
        return;
      }
      setNotice(t("dm_forward_ok"));
      setForwardMessage(null);
    } catch {
      setError(t("dm_forward_failed"));
    } finally {
      setForwardBusyId(null);
    }
  }

  useEffect(() => {
    if (!reactingToId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setReactingToId(null);
    };
    const onPointer = (e: Event) => {
      const node = e.target as Node | null;
      const el = node instanceof Element ? node : node?.parentElement;
      if (el?.closest("[data-dm-react-picker], [data-dm-forward]")) return;
      setReactingToId(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [reactingToId]);

  useEffect(() => {
    if (pendingFiles.length === 0) {
      setPreviewUrls([]);
      return;
    }
    const urls = pendingFiles.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [pendingFiles]);

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
    setPendingFiles([]);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function sendMessage(payload: {
    body?: string;
    attachmentUrl?: string | null;
  }) {
    const res = await fetch(`/api/dm/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Erreur");
    }
    if (data.message) {
      setMessages((prev) => [...prev, data.message]);
    }
  }

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (sending || uploading) return;
    const bodyText = text.trim();
    if (!bodyText && pendingFiles.length === 0) return;

    setSending(true);
    setUploading(true);
    setError("");
    try {
      const files = [...pendingFiles];
      const urls: string[] = [];
      for (const file of files) {
        const att = await uploadCommunityAttachment(file);
        urls.push(att.url);
      }
      if (urls.length === 0) {
        await sendMessage({ body: bodyText });
      } else {
        for (let i = 0; i < urls.length; i++) {
          await sendMessage({
            body: i === 0 ? bodyText || undefined : undefined,
            attachmentUrl: urls[i],
          });
        }
      }
      setText("");
      clearAttachment();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("attach_failed"));
    } finally {
      setSending(false);
      setUploading(false);
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
        processingDays: Number(payProcessingDays),
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
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={calling}
            onClick={() => void startCall("AUDIO")}
          >
            {t("call_audio")}
          </Button>
          {VIDEO_CALLS_ENABLED ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={calling}
              onClick={() => void startCall("VIDEO")}
            >
              {t("call_video")}
            </Button>
          ) : null}
          <Link
            href={
              inRoute || thread?.channel === "IN" || thread?.lastContextType === "IN"
                ? "/in"
                : "/messages"
            }
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            ←{" "}
            {inRoute || thread?.channel === "IN" || thread?.lastContextType === "IN"
              ? t("nav_in")
              : t("messages_title")}
          </Link>
        </div>
      </div>

      {peer && meId && canInvoice && (
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

      {showPayForm && peer && canInvoice && (
        <form
          onSubmit={onRequestPayment}
          className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
        >
          <p className="text-sm font-medium">{t("svc_pay_request")}</p>
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
            <Label htmlFor="pay-days">{t("svc_pay_processing_days")}</Label>
            <Select
              id="pay-days"
              value={payProcessingDays}
              onChange={(e) => setPayProcessingDays(e.target.value)}
            >
              {SERVICE_PROCESSING_DAYS.map((d) => (
                <option key={d} value={d}>
                  {d} {d <= 1 ? t("svc_pay_day") : t("svc_pay_days")}
                </option>
              ))}
            </Select>
            <p className="text-xs text-[var(--muted)]">
              {t("svc_pay_processing_hint")}
            </p>
          </div>
          <Button type="submit" disabled={payBusy}>
            {payBusy ? t("loading") : t("svc_pay_send_request")}
          </Button>
        </form>
      )}

      {payOk && <p className="text-sm text-emerald-700">{payOk}</p>}
      {notice && <p className="text-sm text-emerald-700">{notice}</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}

      {invoices.length > 0 && (
        <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-sm font-medium">{t("svc_pay_in_chat")}</p>
          {invoices.map((p) => {
            const iPay = p.clientId === meId;
            const open =
              p.status === "AWAITING_PAYMENT" ||
              p.status === "AWAITING_CONFIRMATION";
            const followUp =
              p.status === "PAID" || p.status === "DELIVERED";
            const statusKey = servicePaymentStatusI18nKey(p.status, {
              isClient: iPay,
              escrowUntilConfirm: p.escrowUntilConfirm,
            });
            return (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
              >
                <div className="min-w-0 text-sm">
                  <p className="font-medium">{p.title}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {formatMoneyFromCents(p.amountCents, p.currency)}
                    {statusKey ? ` · ${t(statusKey)}` : ""}
                  </p>
                </div>
                {open || followUp ? (
                  <Link
                    href={`/service-payments/${p.id}`}
                    className="text-xs font-semibold text-[var(--accent)] underline"
                  >
                    {open && iPay
                      ? t("svc_pay_pay")
                      : p.status === "DELIVERED" && iPay
                        ? t("svc_pay_confirm_delivery")
                        : t("svc_pay_open")}
                  </Link>
                ) : (
                  <span className="text-xs font-medium text-[var(--muted)]">
                    {statusKey ? t(statusKey) : ""}
                  </span>
                )}
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
          const invoice = paymentId
            ? invoices.find((p) => p.id === paymentId)
            : undefined;
          const paymentOpen =
            !invoice ||
            invoice.status === "AWAITING_PAYMENT" ||
            invoice.status === "AWAITING_CONFIRMATION" ||
            invoice.status === "PAID" ||
            invoice.status === "DELIVERED";
          const iPay = invoice ? invoice.clientId === meId : false;
          const bodyWithoutPayLink = m.body
            .replace(/https?:\/\/\S*\/service-payments\/[a-zA-Z0-9_-]+/gi, "")
            .replace(/\/service-payments\/[a-zA-Z0-9_-]+/gi, "")
            .trim();
          return (
            <DmBubble
              key={m.id}
              message={m}
              mine={mine}
              pickerOpen={reactingToId === m.id}
              onOpenPicker={() => setReactingToId(m.id)}
              onReact={(emoji) => void reactToMessage(m.id, emoji)}
              onShare={() => void shareMessage(m)}
              onForward={() => void openForward(m)}
              shareLabel={t("dm_share")}
              forwardLabel={t("dm_forward")}
            >
            <div
              className={`rounded-2xl px-3 py-2 text-sm select-none ${
                mine
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--surface-2)] text-[var(--foreground)]"
              }`}
            >
              {m.attachmentUrl && (
                <div className="mb-2 space-y-2">
                  {isVoiceMessage(m.attachmentUrl, m.body) ? (
                    <VoiceNoteBubble url={m.attachmentUrl} mine={mine} />
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              )}
              {m.body && !isAttachmentOnlyBody(m.body) && bodyWithoutPayLink && (
                <p className="whitespace-pre-wrap break-words">
                  <LinkedText
                    text={bodyWithoutPayLink}
                    linkClassName={
                      mine
                        ? "break-all font-medium text-white underline underline-offset-2"
                        : undefined
                    }
                  />
                </p>
              )}
              {paymentId && paymentOpen && (
                <Link
                  href={`/service-payments/${paymentId}`}
                  className={`mt-2 inline-block text-xs font-semibold underline ${
                    mine ? "text-white" : "text-[var(--accent)]"
                  }`}
                >
                  {invoice?.status === "DELIVERED" && iPay
                    ? t("svc_pay_confirm_delivery")
                    : invoice?.status === "PAID" ||
                        invoice?.status === "DELIVERED"
                      ? t("svc_pay_open")
                      : iPay
                        ? t("svc_pay_pay")
                        : t("svc_pay_open")}
                </Link>
              )}
              {paymentId && !paymentOpen && (
                <p
                  className={`mt-2 text-xs font-semibold ${
                    mine ? "text-white/90" : "text-[var(--muted)]"
                  }`}
                >
                  {invoice?.status === "FULFILLED"
                    ? t("svc_pay_status_FULFILLED")
                    : invoice?.status === "CANCELLED"
                      ? t("svc_pay_status_CANCELLED")
                      : t("svc_pay_status_EXPIRED")}
                </p>
              )}
              <p
                className={`mt-1 text-[10px] ${
                  mine ? "text-white/70" : "text-[var(--muted)]"
                }`}
              >
                {formatDate(m.createdAt)}
              </p>
            </div>
            </DmBubble>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={onSend} className="space-y-3">
        {pendingFiles.length > 0 && (
          <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2">
            <div className="flex flex-wrap gap-2">
              {pendingFiles.map((file, i) => (
                <div
                  key={`${file.name}-${i}`}
                  className="relative h-16 w-16 overflow-hidden rounded"
                >
                  {file.type.startsWith("image/") && previewUrls[i] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrls[i]}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[var(--surface)] px-1 text-center text-[10px] text-[var(--muted)]">
                      {file.name}
                    </div>
                  )}
                  <button
                    type="button"
                    className="absolute right-0 top-0 rounded-bl bg-black/65 px-1 text-[10px] text-white"
                    onClick={() =>
                      setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))
                    }
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-[var(--muted)]">
              {t("attachment_ready")} · {pendingFiles.length}
            </p>
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
            className="hidden"
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? []);
              if (!picked.length) return;
              setPendingFiles((prev) => {
                const next = [...prev, ...picked].slice(
                  0,
                  COMMUNITY_MAX_ATTACHMENTS
                );
                if (prev.length + picked.length > COMMUNITY_MAX_ATTACHMENTS) {
                  setError(t("dm_attachments_max"));
                }
                return next;
              });
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            title={t("attach_file")}
            disabled={
              sending ||
              uploading ||
              pendingFiles.length >= COMMUNITY_MAX_ATTACHMENTS
            }
            onClick={() => fileRef.current?.click()}
            aria-label={t("attach_file")}
            className="shrink-0"
          >
            <span className="text-lg leading-none">+</span>
          </Button>
          <VoiceNoteButton
            disabled={sending || uploading}
            onRecorded={async (file) => {
              setUploading(true);
              setError("");
              try {
                const att = await uploadCommunityAttachment(file);
                await sendMessage({
                  body: t("voice_note"),
                  attachmentUrl: att.url,
                });
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : t("voice_failed")
                );
                throw err;
              } finally {
                setUploading(false);
              }
            }}
          />
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
              sending || uploading || (!text.trim() && pendingFiles.length === 0)
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

      {forwardMessage && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => {
            if (!forwardBusyId) setForwardMessage(null);
          }}
        >
          <div
            data-dm-forward
            className="max-h-[70vh] w-full max-w-md overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold">{t("dm_forward_title")}</p>
            {forwardLoading ? (
              <p className="mt-3 text-sm text-[var(--muted)]">{t("loading")}</p>
            ) : forwardThreads.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--muted)]">
                {t("dm_forward_empty")}
              </p>
            ) : (
              <ul className="mt-3 space-y-1">
                {forwardThreads.map((thread) => {
                  const name = thread.peer?.displayName || t("dm_direct_chat");
                  const busy = forwardBusyId === thread.id;
                  return (
                    <li key={thread.id}>
                      <button
                        type="button"
                        disabled={Boolean(forwardBusyId)}
                        onClick={() => void sendForward(thread.id)}
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-[var(--surface-2)] disabled:opacity-60"
                      >
                        <UserAvatar
                          name={name}
                          avatarUrl={thread.peer?.avatarUrl}
                          size="sm"
                        />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {name}
                        </span>
                        {busy && (
                          <span className="text-xs text-[var(--muted)]">
                            {t("loading")}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-3 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={Boolean(forwardBusyId)}
                onClick={() => setForwardMessage(null)}
              >
                {t("cancel")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DmBubble({
  message,
  mine,
  pickerOpen,
  onOpenPicker,
  onReact,
  onShare,
  onForward,
  shareLabel,
  forwardLabel,
  children,
}: {
  message: DmMessage;
  mine: boolean;
  pickerOpen: boolean;
  onOpenPicker: () => void;
  onReact: (emoji: string | null) => void;
  onShare: () => void;
  onForward: () => void;
  shareLabel: string;
  forwardLabel: string;
  children: ReactNode;
}) {
  const longPress = useMessageLongPress(onOpenPicker);
  return (
    <div
      data-dm-react
      className={`relative flex max-w-[85%] flex-col ${
        mine ? "ml-auto items-end" : "items-start"
      }`}
    >
      {pickerOpen && (
        <ReactionPicker
          alignEnd={mine}
          onPick={(emoji) => onReact(emoji)}
          onShare={onShare}
          onForward={onForward}
          shareLabel={shareLabel}
          forwardLabel={forwardLabel}
        />
      )}
      <div
        className="w-full touch-manipulation [-webkit-touch-callout:none]"
        {...longPress}
      >
        {children}
      </div>
      <ReactionChips
        reactions={message.reactions ?? []}
        mineBubble={mine}
        onToggle={(emoji) => onReact(emoji)}
      />
    </div>
  );
}
