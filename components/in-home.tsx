"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Phone, UserPlus, Video } from "lucide-react";
import { useI18n } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import { fetchSuggestedCountry } from "@/lib/detect-country";
import { CountryPhoneFields } from "@/components/country-phone-fields";
import { getPhonePlan } from "@/lib/phone-countries";
import { indexByPhoneKeys, lookupByPhoneKeys } from "@/lib/phone-auth";
import { inConversationPath } from "@/lib/dm";

type InMe = {
  id?: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  phoneMasked?: string | null;
  ready?: boolean;
};

type InMatch = {
  userId: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  online?: boolean;
  threadId?: string | null;
};

type InThread = {
  id: string;
  lastMessageAt?: string | null;
  peer?: {
    id?: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  } | null;
  lastMessage?: { body?: string | null; attachmentUrl?: string | null } | null;
};

type LocalContact = { name: string; phone: string };

type ContactsNav = Navigator & {
  contacts?: {
    select: (
      props: string[],
      opts: { multiple: boolean }
    ) => Promise<Array<{ name?: string[]; tel?: string[] }>>;
  };
};

const IN_AD_PATH = "/images/in/rfacto-in-ad.png";
const IN_CONTACTS_STORAGE = "rfacto-in-contacts-v1";

function readStoredContacts(): LocalContact[] {
  try {
    const raw = localStorage.getItem(IN_CONTACTS_STORAGE);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (row): row is LocalContact =>
          Boolean(row) &&
          typeof row === "object" &&
          typeof (row as LocalContact).phone === "string" &&
          (row as LocalContact).phone.trim().length >= 6
      )
      .map((row) => ({
        name: typeof row.name === "string" && row.name.trim() ? row.name.trim() : row.phone,
        phone: row.phone.trim(),
      }))
      .slice(0, 400);
  } catch {
    return [];
  }
}

function writeStoredContacts(rows: LocalContact[]) {
  try {
    localStorage.setItem(IN_CONTACTS_STORAGE, JSON.stringify(rows.slice(0, 400)));
  } catch {
    // quota / private mode
  }
}

function inviteUrl(agentCode?: string | null) {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://www.rfacto.com";
  const code = agentCode?.trim();
  return code
    ? `${origin}/share/in?ref=${encodeURIComponent(code)}`
    : `${origin}/share/in`;
}

export function InHome({
  displayName,
  avatarUrl,
  agentCode,
  title,
  tagline,
}: {
  displayName: string;
  avatarUrl: string | null;
  agentCode: string | null;
  title: string;
  tagline: string;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [me, setMe] = useState<InMe>({
    displayName,
    avatarUrl,
    ready: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [phoneHint, setPhoneHint] = useState("");
  const [region, setRegion] = useState("CA");
  const [busy, setBusy] = useState(false);
  const [lookup, setLookup] = useState("");
  const [matches, setMatches] = useState<InMatch[]>([]);
  const [inThreads, setInThreads] = useState<InThread[]>([]);
  const [locals, setLocals] = useState<LocalContact[]>([]);
  const [copied, setCopied] = useState(false);
  const [pickerOk, setPickerOk] = useState(false);
  const [lookupMissed, setLookupMissed] = useState(false);
  const [pane, setPane] = useState<"chat" | "directory" | "calls">("chat");

  useEffect(() => {
    const nav = navigator as ContactsNav;
    setPickerOk(Boolean(nav.contacts?.select));
    fetchSuggestedCountry()
      .then((detected) => {
        if (detected?.code && getPhonePlan(detected.code)) {
          setRegion(detected.code);
        }
      })
      .catch(() => {});
    fetch("/api/in/me")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok) setMe(data);
        else setError(typeof data.error === "string" ? data.error : "");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!me.ready) return;
    void loadInThreads();
    const stored = readStoredContacts();
    if (!stored.length) return;
    setLocals(stored);
    void matchPhones(stored.map((row) => row.phone), { merge: true });
  }, [me.ready]);

  async function matchPhones(
    phones: string[],
    opts?: { merge?: boolean }
  ) {
    if (!phones.length) return;
    const res = await fetch("/api/in/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phones }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "");
      return;
    }
    const incoming = (data.matches || []) as InMatch[];
    setMatches((prev) => {
      if (!opts?.merge) return incoming;
      const map = new Map(prev.map((item) => [item.userId, item]));
      for (const item of incoming) map.set(item.userId, item);
      return [...map.values()];
    });
  }

  async function loadInThreads() {
    const res = await fetch("/api/dm?scope=in");
    const data = await res.json().catch(() => ({}));
    if (res.ok) setInThreads(data.threads || []);
  }

  async function requestCode() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/phone/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, country: region }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || t("in_need_phone"));
      return;
    }
    setMfaToken(data.mfaToken);
    setPhoneHint(typeof data.phoneHint === "string" ? data.phoneHint : "");
    setInfo(
      data.phoneHint
        ? `${t("in_otp_sent")} ${data.phoneHint}`
        : t("in_otp_sent")
    );
  }

  async function resendCode() {
    if (!mfaToken) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/phone/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mfaToken }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || t("in_need_phone"));
      return;
    }
    if (typeof data.mfaToken === "string") setMfaToken(data.mfaToken);
    if (typeof data.phoneHint === "string" && data.phoneHint) {
      setPhoneHint(data.phoneHint);
    }
    setInfo(
      data.phoneHint
        ? `${t("in_otp_sent")} ${data.phoneHint}`
        : t("in_otp_sent")
    );
  }

  async function confirmCode() {
    if (!mfaToken) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/in/phone/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mfaToken, code }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || t("in_need_phone"));
      return;
    }
    setMe({ ...(data.user || {}), ready: true });
    setInfo("");
  }

  async function changePhoto(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const up = await fetch("/api/upload", { method: "POST", body: fd });
    const uploaded = await up.json().catch(() => ({}));
    if (!up.ok || !uploaded.url) {
      setError(uploaded.error || t("in_change_photo"));
      return;
    }
    const patch = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarUrl: uploaded.url }),
    });
    if (patch.ok) {
      setMe((prev) => ({ ...prev, avatarUrl: uploaded.url }));
    }
  }

  async function importContacts() {
    const nav = navigator as ContactsNav;
    if (!nav.contacts?.select) {
      setError(t("in_import_unavailable"));
      return;
    }
    try {
      const picked = await nav.contacts.select(["name", "tel"], { multiple: true });
      const rows: LocalContact[] = [];
      for (const c of picked) {
        const name = c.name?.[0]?.trim() || "";
        for (const tel of c.tel || []) {
          if (tel.trim()) rows.push({ name: name || tel, phone: tel.trim() });
        }
      }
      setLocals(rows);
      writeStoredContacts(rows);
      await matchPhones(rows.map((r) => r.phone));
    } catch {
      // user cancelled
    }
  }

  async function findOne() {
    if (!lookup.trim()) return;
    setBusy(true);
    setError("");
    setLookupMissed(false);
    const res = await fetch("/api/in/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phones: [lookup.trim()] }),
    });
    const data = await res.json().catch(() => ({}));
    const found = (data.matches || []) as InMatch[];
    if (!res.ok) {
      setError(data.error || "");
      setBusy(false);
      return;
    }
    setLookupMissed(found.length === 0);
    setMatches((prev) => {
      const map = new Map(prev.map((item) => [item.userId, item]));
      for (const item of found) map.set(item.userId, item);
      return [...map.values()];
    });
    setBusy(false);
  }

  async function openChat(match: InMatch) {
    if (match.threadId) {
      router.push(inConversationPath(match.threadId));
      return;
    }
    const res = await fetch("/api/dm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toUserId: match.userId, contextType: "IN" }),
    });
    const data = await res.json().catch(() => ({}));
    const id = data.thread?.id;
    if (!res.ok || !id) {
      setError(data.error || "");
      return;
    }
    router.push(inConversationPath(id));
  }

  const link = inviteUrl(agentCode);
  const inviteName = (me.displayName || displayName).trim();
  const inviteText = (
    inviteName
      ? t("in_invite_share_signed").replace("{name}", inviteName)
      : t("in_invite_share")
  ).replace("{url}", link);

  async function shareInvite() {
    try {
      const res = await fetch(IN_AD_PATH);
      const blob = await res.blob();
      const file = new File([blob], "rfacto-in.png", {
        type: blob.type || "image/png",
      });
      const withFile = {
        title: "Rfacto + In",
        text: inviteText,
        url: link,
        files: [file],
      };
      if (navigator.canShare?.(withFile)) {
        await navigator.share(withFile);
        return;
      }
    } catch {
      // fall through to text share
    }
    if (navigator.share) {
      try {
        await navigator.share({ title: "Rfacto + In", text: inviteText, url: link });
        return;
      } catch {
        // fall through
      }
    }
    await navigator.clipboard.writeText(inviteText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const matchByPhone = useMemo(
    () => indexByPhoneKeys(matches, (item) => item.phone),
    [matches]
  );

  const onIn = locals
    .map((c) => ({ ...c, match: lookupByPhoneKeys(matchByPhone, c.phone) }))
    .filter((r) => r.match);
  const uniqueOnIn = Array.from(
    new Map(onIn.map((r) => [r.match!.userId, r])).values()
  );
  const unmatchedMatches = matches.filter(
    (item) => !uniqueOnIn.some((row) => row.match!.userId === item.userId)
  );
  const chatPeople = (() => {
    const byId = new Map<
      string,
      { name: string; phone: string; match: InMatch }
    >();
    for (const row of uniqueOnIn) {
      byId.set(row.match!.userId, {
        name: row.match!.displayName || row.name,
        phone: row.phone,
        match: row.match!,
      });
    }
    for (const item of unmatchedMatches) {
      if (byId.has(item.userId)) continue;
      byId.set(item.userId, {
        name: item.displayName || "In",
        phone: item.phone || "",
        match: item,
      });
    }
    for (const th of inThreads) {
      const peerId = th.peer?.id;
      if (!peerId || byId.has(peerId)) continue;
      byId.set(peerId, {
        name: th.peer?.displayName || "In",
        phone: "",
        match: {
          userId: peerId,
          displayName: th.peer?.displayName,
          avatarUrl: th.peer?.avatarUrl,
          threadId: th.id,
        },
      });
    }
    return [...byId.values()];
  })();
  const chatRoster = chatPeople.filter(
    (row) => !inThreads.some((th) => th.peer?.id === row.match.userId)
  );
  const invitees = locals.filter((c) => !lookupByPhoneKeys(matchByPhone, c.phone));

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl bg-[#10241F] px-5 py-6 text-white">
        <p className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[#D4AF37]">
          {title}
        </p>
        <p className="mt-1 text-sm text-[#F3E6B0]">{tagline}</p>
        <div className="mt-5 flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative shrink-0"
            aria-label={t("in_change_photo")}
          >
            {me.avatarUrl ? (
              <UserAvatar
                name={me.displayName || displayName}
                avatarUrl={me.avatarUrl}
                size="xl"
                online
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#D4AF37] bg-[#10241F] font-[family-name:var(--font-display)] text-xl font-bold text-[#D4AF37]">
                In
              </div>
            )}
            <span className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-[#D4AF37] text-xs text-[#10241F]">
              +
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void changePhoto(file);
            }}
          />
          <div>
            <p className="text-xl font-semibold">{me.displayName || displayName}</p>
            <p className="text-[#D4AF37]">{me.phoneMasked || t("in_need_phone")}</p>
            <p className="mt-1 text-sm font-medium text-[#F3E6B0]">
              {t("in_photo_hint")}
            </p>
          </div>
        </div>
      </section>

      {loading ? (
        <p className="text-sm text-[var(--muted)]">…</p>
      ) : me.ready ? (
        <div className="flex min-h-[28rem] flex-col gap-4 md:flex-row">
          <InIconNav
            pane={pane}
            onPane={setPane}
            chatCount={chatPeople.length}
            inviteCount={invitees.length}
            variant="rail"
            className="hidden md:flex"
          />
          <div className="min-w-0 flex-1 space-y-4 pb-20 md:pb-0">
          {(pane === "chat" || pane === "calls") && (
            <>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="in-lookup">{t("in_search_phone")}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="in-lookup"
                      value={lookup}
                      onChange={(e) => setLookup(e.target.value)}
                      placeholder={
                        getPhonePlan(region)?.placeholder || "514 555 0123"
                      }
                    />
                    <Button type="button" onClick={() => void findOne()} disabled={busy}>
                      {t("in_find")}
                    </Button>
                  </div>
                </div>
              </div>

              {inThreads.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold text-[#D4AF37]">
                    {t("in_conversations")}
                  </h2>
                  <div className="grid gap-3">
                    {inThreads.map((th) => (
                      <Card
                        key={th.id}
                        className="flex items-center justify-between gap-3 p-4"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <UserAvatar
                            name={th.peer?.displayName || "In"}
                            avatarUrl={th.peer?.avatarUrl}
                            size="lg"
                          />
                          <div className="min-w-0">
                            <p className="font-medium">
                              {th.peer?.displayName || t("dm_direct_chat")}
                            </p>
                            <p className="truncate text-sm text-[var(--muted)]">
                              {th.lastMessage?.body?.trim() ||
                                (th.lastMessage?.attachmentUrl
                                  ? t("attachment_label")
                                  : t("no_messages"))}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() =>
                            router.push(inConversationPath(th.id))
                          }
                        >
                          {t("in_open_chat")}
                        </Button>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {chatRoster.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold text-[#D4AF37]">
                    {t("in_on_network").replace("{n}", String(chatPeople.length))}
                  </h2>
                  <div className="grid gap-3">
                    {chatRoster.map((row) => {
                      const match = row.match!;
                      return (
                        <Card key={match.userId} className="flex items-center justify-between gap-3 p-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <UserAvatar
                              name={match.displayName || row.name}
                              avatarUrl={match.avatarUrl}
                              size="lg"
                              online={match.online}
                            />
                            <div className="min-w-0">
                              <p className="font-medium">
                                {match.displayName || row.name}
                              </p>
                              <p className="text-sm text-[var(--muted)]">
                                {match.online ? t("in_online") : row.phone}
                              </p>
                            </div>
                          </div>
                          <Button size="sm" onClick={() => void openChat(match)}>
                            {pane === "calls" ? t("in_tab_calls") : t("in_open_chat")}
                          </Button>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {chatPeople.length === 0 && inThreads.length === 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-[var(--muted)]">
                    {pane === "calls" ? t("in_calls_empty") : t("in_chat_empty")}
                  </p>
                  {pane === "chat" ? (
                    <Button
                      type="button"
                      variant="gold"
                      onClick={() => void importContacts()}
                    >
                      {t("in_import_contacts")}
                    </Button>
                  ) : null}
                </div>
              )}

              {lookupMissed && (
                <p className="text-sm text-[var(--muted)]">{t("in_not_found")}</p>
              )}
            </>
          )}

          {pane === "directory" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-end gap-3">
                <Button
                  type="button"
                  variant="gold"
                  onClick={() => void importContacts()}
                >
                  {t("in_import_contacts")}
                </Button>
                <Button type="button" variant="outline" onClick={() => void shareInvite()}>
                  {copied ? t("in_invite_copied") : t("in_share_invite")}
                </Button>
              </div>
              {!pickerOk && (
                <p className="text-xs text-[var(--muted)]">{t("in_import_unavailable")}</p>
              )}
              <h2 className="text-lg font-semibold">{t("in_invite_section")}</h2>
              <p className="text-sm text-[var(--muted)]">{t("in_invite_hint")}</p>
              {invitees.length === 0 && (
                <p className="text-sm text-[var(--muted)]">{t("in_empty")}</p>
              )}
              {invitees.slice(0, 40).map((c) => (
                <Card key={`${c.name}-${c.phone}`} className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-sm text-[var(--muted)]">{c.phone}</p>
                  </div>
                  <a
                    href={`sms:${encodeURIComponent(c.phone)}?body=${encodeURIComponent(inviteText)}`}
                    className="text-sm font-medium text-[var(--accent)]"
                  >
                    SMS
                  </a>
                </Card>
              ))}
            </div>
          )}
          </div>
          <InIconNav
            pane={pane}
            onPane={setPane}
            chatCount={chatPeople.length}
            inviteCount={invitees.length}
            variant="bar"
            className="md:hidden"
          />
        </div>
      ) : (
        <Card className="space-y-4 p-5">
          <h2 className="text-xl font-semibold">{t("in_activate_title")}</h2>
          <p className="text-sm text-[var(--muted)]">{t("in_activate_body")}</p>
          {!mfaToken ? (
            <div className="space-y-2">
              <CountryPhoneFields
                id="in-phone"
                region={region}
                onRegionChange={setRegion}
                phone={phone}
                onPhoneChange={setPhone}
              />
              <Button type="button" disabled={busy || !phone.trim()} onClick={() => void requestCode()}>
                {t("in_send_code")}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="in-otp">{t("in_otp")}</Label>
              {phoneHint ? (
                <p className="text-sm text-[var(--muted)]">{phoneHint}</p>
              ) : null}
              <Input
                id="in-otp"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
              />
              <Button
                type="button"
                disabled={busy || code.length < 4}
                onClick={() => void confirmCode()}
              >
                {t("in_confirm_code")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => void resendCode()}
              >
                {t("otp_resend")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setMfaToken(null);
                  setCode("");
                  setPhoneHint("");
                  setInfo("");
                }}
              >
                {t("in_change_number")}
              </Button>
            </div>
          )}
        </Card>
      )}

      {info && <p className="text-sm text-[#D4AF37]">{info}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function InIconNav({
  pane,
  onPane,
  chatCount,
  inviteCount,
  variant,
  className = "",
}: {
  pane: "chat" | "directory" | "calls";
  onPane: (next: "chat" | "directory" | "calls") => void;
  chatCount: number;
  inviteCount: number;
  variant: "rail" | "bar";
  className?: string;
}) {
  const { t } = useI18n();
  const items = [
    { id: "chat" as const, label: t("in_tab_chat"), Icon: MessageCircle, badge: chatCount },
    { id: "directory" as const, label: t("in_tab_directory"), Icon: UserPlus, badge: inviteCount },
    { id: "calls" as const, label: t("in_tab_calls"), Icon: Phone, badge: 0 },
  ];
  const rail = variant === "rail";

  return (
    <nav
      className={
        rail
          ? `sticky top-24 flex w-[4.5rem] shrink-0 flex-col items-center gap-2 rounded-2xl bg-[#10241F] py-4 ${className}`
          : `fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-[#1c3a32] bg-[#10241F] px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] ${className}`
      }
      aria-label="In"
    >
      {items.map((item) => {
        const active = pane === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onPane(item.id)}
            className={`relative flex flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 ${
              active ? "text-[#D4AF37]" : "text-[#F3E6B0]/70"
            }`}
          >
            <item.Icon className="h-6 w-6" strokeWidth={active ? 2.4 : 1.8} />
            <span className="text-[11px] font-medium">{item.label}</span>
            {item.badge > 0 && (
              <span className="absolute right-1 top-0 min-w-4 rounded-full bg-[#D4AF37] px-1 text-center text-[10px] font-bold text-[#10241F]">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
      <button
        type="button"
        disabled
        title={t("in_tab_live_soon")}
        className="flex flex-col items-center justify-center gap-1 px-3 py-2 text-[#F3E6B0]/30"
      >
        <Video className="h-6 w-6" />
        <span className="text-[11px] font-medium">{t("in_tab_live")}</span>
      </button>
    </nav>
  );
}
