import { type Href, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  Share,
  Text,
  View,
} from "react-native";
import { Button, Card, ErrorText, Muted, Screen, Title } from "@/components/ui";
import { api, mediaUrl } from "@/lib/api";
import { chatReplyListPreview } from "@/lib/chat-reply";
import { useAuth } from "@/lib/auth-context";
import {
  callStatusPreviewKey,
  type ThreadLastCall,
} from "@/lib/calls";
import { formatChatListTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useOptionalTheme } from "@/lib/theme-context";
import { colors as lightColors } from "@/lib/theme";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/store-testing";

type Peer = { displayName?: string | null; avatarUrl?: string | null };

type DmThread = {
  id: string;
  lastMessageAt?: string | null;
  lastContextType?: string | null;
  updatedAt?: string | null;
  activityAt?: string | null;
  unreadCount?: number;
  peer?: Peer;
  lastMessage?: { body?: string | null; attachmentUrl?: string | null } | null;
  lastCall?: ThreadLastCall | null;
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
  previewMissed?: boolean;
  date: string | null;
  unreadCount: number;
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
      <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 18 }}>
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
  return chatReplyListPreview(body, attachmentUrl, empty);
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
          unreadCount: 0,
        });
      }

      for (const th of dm.threads ?? []) {
        const lastCall = th.lastCall ?? null;
        const lastMsgAt = th.lastMessageAt
          ? new Date(th.lastMessageAt).getTime()
          : 0;
        const lastCallAt = lastCall?.createdAt
          ? new Date(lastCall.createdAt).getTime()
          : 0;
        const callIsNewer = Boolean(lastCall && lastCallAt >= lastMsgAt);
        const missedInbound =
          Boolean(lastCall) &&
          (lastCall!.missed ||
            (lastCall!.status || "").toUpperCase() === "MISSED") &&
          lastCall!.direction === "inbound";
        let preview = previewOf(
          th.lastMessage?.body,
          th.lastMessage?.attachmentUrl,
          t("no_messages")
        );
        if (callIsNewer && lastCall) {
          preview = t(callStatusPreviewKey(lastCall));
        }
        next.push({
          key: `dm-${th.id}`,
          href: `/messages/${th.id}`,
          name: th.peer?.displayName || "Contact",
          avatarUrl: th.peer?.avatarUrl,
          title: `${th.peer?.displayName || "Contact"} · ${t(dmContextLabel(th.lastContextType))}`,
          preview,
          previewMissed: missedInbound && callIsNewer,
          date:
            th.activityAt ??
            (callIsNewer && lastCall
              ? lastCall.createdAt
              : th.lastMessageAt ?? th.updatedAt ?? null),
          unreadCount: th.unreadCount ?? 0,
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
          unreadCount: 0,
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

  useEffect(() => {
    setRows([]);
    void load();
  }, [user?.id, load]);

  async function shareInvite(url: string) {
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

  function pickStoreAndShare() {
    Alert.alert(t("invite_share_pick_title"), t("invite_share_pick_hint"), [
      {
        text: t("invite_share_android"),
        onPress: () => void shareInvite(PLAY_STORE_URL),
      },
      {
        text: t("invite_share_iphone"),
        onPress: () => void shareInvite(APP_STORE_URL),
      },
      { text: t("close"), style: "cancel" },
    ]);
  }

  return (
    <Screen style={{ paddingBottom: 8 }}>
      <FlatList
        style={{ flex: 1 }}
        data={rows}
        keyExtractor={(item) => item.key}
        refreshing={loading}
        onRefresh={() => void load()}
        contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 8 }}>
            <Title>{t("messages_title")}</Title>
            <Muted>{t("messages_subtitle")}</Muted>
            <View style={{ marginTop: 12 }}>
              <Button
                label={t("invite_contacts_share_link")}
                variant="outline"
                onPress={pickStoreAndShare}
              />
            </View>
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
        renderItem={({ item }) => {
          const unread = item.unreadCount > 0;
          return (
          <Pressable onPress={() => router.push(item.href)}>
            <Card
              style={
                unread
                  ? { backgroundColor: colors.accentSoft, borderColor: colors.accent }
                  : undefined
              }
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <Avatar name={item.name} url={item.avatarUrl} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: unread ? "800" : "700",
                        fontSize: 15,
                        color: colors.foreground,
                        flex: 1,
                      }}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    {item.date ? (
                      <Text
                        style={{
                          color: unread ? colors.accent : colors.muted,
                          fontSize: 12,
                          fontWeight: unread ? "700" : "500",
                        }}
                      >
                        {formatChatListTime(item.date)}
                      </Text>
                    ) : null}
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      marginTop: 2,
                    }}
                  >
                    <Text
                      style={{
                        color: item.previewMissed
                          ? "#DC2626"
                          : unread
                            ? colors.foreground
                            : colors.muted,
                        fontSize: 13,
                        fontWeight: unread || item.previewMissed ? "600" : "400",
                        flex: 1,
                      }}
                      numberOfLines={2}
                    >
                      {item.preview}
                    </Text>
                    {unread ? (
                      <View
                        style={{
                          minWidth: 22,
                          height: 22,
                          borderRadius: 11,
                          backgroundColor: colors.accent,
                          alignItems: "center",
                          justifyContent: "center",
                          paddingHorizontal: 6,
                        }}
                      >
                        <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>
                          {item.unreadCount > 9 ? "9+" : item.unreadCount}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
            </Card>
          </Pressable>
          );
        }}
      />
    </Screen>
  );
}
