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
import { formatDate } from "@/lib/utils";
import { loadUserIntent } from "@/lib/user-intent";

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

export default function DirectMessageChatPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const [meId, setMeId] = useState("");
  const [peer, setPeer] = useState<Peer | null>(null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showPayForm, setShowPayForm] = useState(false);
  const [payTitle, setPayTitle] = useState("");
  const [payDescription, setPayDescription] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payReceiver, setPayReceiver] = useState("");
  const [payBusy, setPayBusy] = useState(false);
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
      setThread(msgData.thread ?? null);
      setError("");
    } else {
      setError(msgData.error || "Erreur");
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
    if (thread?.lastContextType === "SERVICE" && thread.lastContextId) {
      fetch(`/api/services/${thread.lastContextId}`)
        .then(async (res) => {
          if (!res.ok) return;
          const data = await res.json();
          const listing = data.listing;
          if (!listing) return;
          setPayTitle(listing.title || "");
          if (listing.priceAmount != null) {
            setPayAmount(String(listing.priceAmount));
          }
        })
        .catch(() => {});
    }
  }, [thread?.lastContextType, thread?.lastContextId]);

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
        listingId:
          thread?.lastContextType === "SERVICE"
            ? thread.lastContextId
            : undefined,
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

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="flex min-h-[50vh] flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        {messages.length === 0 && (
          <p className="text-sm text-[var(--muted)]">{t("no_messages")}</p>
        )}
        {messages.map((m) => {
          const mine = m.senderId === meId;
          const paymentLink =
            m.contextType === "SERVICE" &&
            m.contextId &&
            m.body.includes("/service-payments/")
              ? `/service-payments/${m.contextId}`
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
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
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
