import { type Href, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Share,
  Text,
  View,
} from "react-native";
import { Button, Card, ErrorText, Muted, Screen, Title } from "@/components/ui";
import { api, getApiUrl, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useOptionalTheme } from "@/lib/theme-context";
import { colors as lightColors } from "@/lib/theme";

type Peer = { displayName?: string | null; avatarUrl?: string | null };

type DmThread = {
  id: string;
  lastMessageAt?: string | null;
  lastContextType?: string | null;
  updatedAt?: string | null;
  peer?: Peer;
  lastMessage?: { body?: string | null; attachmentUrl?: string | null } | null;
};

type Booking = {
  id: string;
  status: string;
  senderId: string;
  updatedAt?: string | null;
  request?: { fromCity?: string; toCity?: string };
  trip?: { user?: Peer };
  sender?: Peer;
  messages?: { body?: string | null; attachmentUrl?: string | null; createdAt?: string }[];
};

type ServicePayment = {
  id: string;
  title?: string | null;
  status?: string | null;
  amountCents?: number | null;
  currency?: string | null;
  clientId?: string | null;
  threadId?: string | null;
  createdAt?: string | null;
  escrowUntilConfirm?: boolean | null;
  client?: Peer;
  provider?: Peer;
};

type InboxRow = {
  key: string;
  href: Href;
  name: string;
  avatarUrl?: string | null;
  title: string;
  preview: string;
  date: string | null;
};

function Avatar({ name, url }: { name: string; url?: string | null }) {
  const colors = useOptionalTheme()?.colors ?? lightColors;
  const src = url ? mediaUrl(url) : "";
  if (src) {
    return (
      <Image
        source={{ uri: src }}
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: colors.accentSoft,
        }}
      />
    );
  }
  return (
    <View
      style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.accentSoft,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: colors.accent, fontWeight: "700", fontSize: 18 }}>
        {(name || "R").slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}

function dmContextLabel(type: string | null | undefined) {
  if (type === "JOB") return "dm_context_job" as const;
  if (type === "SERVICE") return "dm_context_service" as const;
  if (type === "MEET") return "dm_context_meet" as const;
  if (type === "IN") return "dm_context_in" as const;
  return "dm_direct_chat" as const;
}

function previewOf(
  body?: string | null,
  attachmentUrl?: string | null,
  empty = "Aucun message"
) {
  if (attachmentUrl) return `📎 ${body?.slice(0, 60) || "Pièce jointe"}`;
  const text = (body || "").trim();
  if (!text) return empty;
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
  const colors = useOptionalTheme()?.colors ?? lightColors;
  const [rows, setRows] = useState<InboxRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [agentCode, setAgentCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [dm, bookingsRes, payRes, profile] = await Promise.all([
        api<{ threads?: DmThread[] }>("/api/dm"),
        api<{ bookings?: Booking[] }>("/api/bookings"),
        api<{ payments?: ServicePayment[] }>("/api/service-payments").catch(
          () => ({ payments: [] as ServicePayment[] })
        ),
        api<{ user?: { agentCode?: string | null; displayName?: string } }>(
          "/api/profile"
        ).catch(() => ({ user: undefined })),
      ]);
      setAgentCode(profile.user?.agentCode ?? null);

      const next: InboxRow[] = [];

      for (const p of payRes.payments ?? []) {
        const active =
          p.status === "AWAITING_PAYMENT" ||
          p.status === "AWAITING_CONFIRMATION" ||
          ((p.status === "PAID" || p.status === "DELIVERED") &&
            p.escrowUntilConfirm === true);
        if (!active) continue;
        const iPay = p.clientId === user?.id;
        const other = iPay ? p.provider : p.client;
        const amount = ((p.amountCents ?? 0) / 100).toFixed(2);
        if (!p.threadId) continue;
        next.push({
          key: `pay-${p.id}`,
          href: `/messages/${p.threadId}`,
          name: other?.displayName || "—",
          avatarUrl: other?.avatarUrl,
          title: p.title || t("svc_pay_inbox"),
          preview: `${iPay ? t("svc_pay_you_pay") : t("svc_pay_you_receive")} · ${other?.displayName || "—"} · ${amount} ${(p.currency || "CAD").toUpperCase()}`,
          date: p.createdAt ?? null,
        });
      }

      for (const th of dm.threads ?? []) {
        next.push({
          key: `dm-${th.id}`,
          href: `/messages/${th.id}`,
          name: th.peer?.displayName || "Contact",
          avatarUrl: th.peer?.avatarUrl,
          title: `${th.peer?.displayName || "Contact"} · ${t(dmContextLabel(th.lastContextType))}`,
          preview: previewOf(
            th.lastMessage?.body,
            th.lastMessage?.attachmentUrl,
            t("no_messages")
          ),
          date: th.lastMessageAt ?? th.updatedAt ?? null,
        });
      }

      for (const b of bookingsRes.bookings ?? []) {
        if (b.status === "CANCELLED" || b.status === "REFUSED") continue;
        const isSender = b.senderId === user?.id;
        const peer = isSender ? b.trip?.user : b.sender;
        const last = b.messages?.[0];
        next.push({
          key: `b-${b.id}`,
          href: `/booking/${b.id}`,
          name: peer?.displayName || "—",
          avatarUrl: peer?.avatarUrl,
          title: `${peer?.displayName || "—"} · ${b.request?.fromCity || "?"} → ${b.request?.toCity || "?"}`,
          preview: previewOf(last?.body, last?.attachmentUrl, t("order_need_parcel")),
          date: last?.createdAt ?? b.updatedAt ?? null,
        });
      }

      next.sort((a, b) => {
        const ta = a.date ? new Date(a.date).getTime() : 0;
        const tb = b.date ? new Date(b.date).getTime() : 0;
        return tb - ta;
      });
      setRows(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [t, user?.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function shareInvite() {
    const url = agentCode
      ? `${getApiUrl()}/register?ref=${encodeURIComponent(agentCode)}`
      : `${getApiUrl()}/register`;
    const who = user?.displayName || "Rfacto";
    try {
      await Share.share({
        message: t("invite_contacts_message")
          .replace("{who}", who)
          .replace("{url}", url),
      });
    } catch {
      /* cancelled */
    }
  }

  return (
    <Screen style={{ paddingBottom: 0 }}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.key}
        refreshing={loading}
        onRefresh={() => void load()}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 8 }}>
            <Title>{t("messages_title")}</Title>
            <Muted>{t("messages_subtitle")}</Muted>
            <View style={{ marginTop: 12 }}>
              <Button
                label={t("invite_contacts_share_link")}
                variant="outline"
                onPress={() => void shareInvite()}
              />
            </View>
            <Text
              style={{
                color: colors.muted,
                fontSize: 12,
                marginTop: 8,
                marginBottom: 8,
              }}
            >
              {t("invite_contacts_hint")}
            </Text>
            <ErrorText>{error}</ErrorText>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
          ) : (
            <Muted>{t("no_messages")}</Muted>
          )
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(item.href)}>
            <Card>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <Avatar name={item.name} url={item.avatarUrl} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontWeight: "700",
                      fontSize: 15,
                      color: colors.foreground,
                    }}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}
                    numberOfLines={2}
                  >
                    {item.preview}
                    {item.date ? ` · ${formatDate(item.date)}` : ""}
                  </Text>
                </View>
                <Text
                  style={{ color: colors.accent, fontWeight: "700", fontSize: 13 }}
                >
                  {t("open")}
                </Text>
              </View>
            </Card>
          </Pressable>
        )}
      />
    </Screen>
  );
}
