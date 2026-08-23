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

type LocalContact = { name: string; phone: string };

type ContactsNav = Navigator & {
  contacts?: {
    select: (
      props: string[],
      opts: { multiple: boolean }
    ) => Promise<Array<{ name?: string[]; tel?: string[] }>>;
  };
};

function inviteUrl(agentCode?: string | null) {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://www.rfacto.com";
  const code = agentCode?.trim();
  return code
    ? `${origin}/register?ref=${encodeURIComponent(code)}`
    : `${origin}/register`;
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
  const [region, setRegion] = useState("CA");
  const [busy, setBusy] = useState(false);
  const [lookup, setLookup] = useState("");
  const [matches, setMatches] = useState<InMatch[]>([]);
  const [locals, setLocals] = useState<LocalContact[]>([]);
  const [copied, setCopied] = useState(false);
  const [pickerOk, setPickerOk] = useState(false);
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

  async function matchPhones(phones: string[]) {
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
    setMatches(data.matches || []);
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
    setInfo(t("in_otp_sent"));
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
      await matchPhones(rows.map((r) => r.phone));
    } catch {
      // user cancelled
    }
  }

  async function findOne() {
    if (!lookup.trim()) return;
    setBusy(true);
    setError("");
    await matchPhones([lookup.trim()]);
    setLocals((prev) => {
      if (prev.some((p) => p.phone === lookup.trim())) return prev;
      return [{ name: lookup.trim(), phone: lookup.trim() }, ...prev];
    });
    setBusy(false);
  }

  async function openChat(match: InMatch) {
    if (match.threadId) {
      router.push(`/messages/dm/${match.threadId}`);
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
    router.push(`/messages/dm/${id}`);
  }

  const link = inviteUrl(agentCode);
  const inviteText =
    locale === "en"
      ? `Join me on In — the network of opportunities.\n${link}`
      : `Rejoins-moi sur In — le réseau des opportunités.\n${link}`;

  async function shareInvite() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "In", text: inviteText, url: link });
        return;
      } catch {
        // fall through
      }
    }
    await navigator.clipboard.writeText(inviteText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const matchByPhone = useMemo(() => {
    const map = new Map<string, InMatch>();
    for (const m of matches) {
      const digits = (m.phone || "").replace(/\D/g, "");
      if (digits) map.set(digits, m);
      if (digits.length >= 8) map.set(digits.slice(-8), m);
      if (digits.length >= 10) map.set(digits.slice(-10), m);
    }
    return map;
  }, [matches]);

  const onIn = locals
    .map((c) => {
      const digits = c.phone.replace(/\D/g, "");
      const match =
        matchByPhone.get(digits) ||
        (digits.length >= 10 ? matchByPhone.get(digits.slice(-10)) : undefined) ||
        (digits.length >= 8 ? matchByPhone.get(digits.slice(-8)) : undefined);
      return { ...c, match };
    })
    .filter((r) => r.match);
  const uniqueOnIn = Array.from(
    new Map(onIn.map((r) => [r.match!.userId, r])).values()
  );
  const invitees = locals.filter((c) => {
    const digits = c.phone.replace(/\D/g, "");
    return !(
      matchByPhone.get(digits) ||
      (digits.length >= 10 && matchByPhone.get(digits.slice(-10))) ||
      (digits.length >= 8 && matchByPhone.get(digits.slice(-8)))
    );
  });

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
            chatCount={uniqueOnIn.length}
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

              {uniqueOnIn.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold text-[#D4AF37]">
                    {t("in_on_network").replace("{n}", String(uniqueOnIn.length))}
                  </h2>
                  <div className="grid gap-3">
                    {uniqueOnIn.map((row) => {
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

              {matches.length > 0 && uniqueOnIn.length === 0 && (
                <div className="grid gap-3">
                  {matches.map((match) => (
                    <Card key={match.userId} className="flex items-center justify-between gap-3 p-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <UserAvatar
                          name={match.displayName || "In"}
                          avatarUrl={match.avatarUrl}
                          size="lg"
                          online={match.online}
                        />
                        <div>
                          <p className="font-medium">{match.displayName}</p>
                          <p className="text-sm text-[var(--muted)]">
                            {match.online ? t("in_online") : match.phone}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => void openChat(match)}>
                        {pane === "calls" ? t("in_tab_calls") : t("in_open_chat")}
                      </Button>
                    </Card>
                  ))}
                </div>
              )}

              {uniqueOnIn.length === 0 && matches.length === 0 && (
                <p className="text-sm text-[var(--muted)]">
                  {pane === "calls" ? t("in_calls_empty") : t("in_chat_empty")}
                </p>
              )}

              {lookup && matches.length === 0 && locals.length > 0 && (
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
            chatCount={uniqueOnIn.length}
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
                onClick={() => {
                  setMfaToken(null);
                  setCode("");
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
