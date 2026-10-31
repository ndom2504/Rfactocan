import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { type Href, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import { ErrorText, Muted, Screen } from "@/components/ui";
import { api, mediaUrl, uploadFile } from "@/lib/api";
import { chatReplyListPreview } from "@/lib/chat-reply";
import { useAuth } from "@/lib/auth-context";
import {
  callStatusPreviewKey,
  type ThreadLastCall,
} from "@/lib/calls";
import { formatChatListTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import {
  MEMBER_STATUS_VIDEO_MAX_SEC,
  isStatusVideoUrl,
  statusEmoji,
  statusLabelKey,
  type MemberStatusItem,
} from "@/lib/member-status";
import { useOptionalTheme } from "@/lib/theme-context";
import { colors as lightColors } from "@/lib/theme";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/store-testing";

type Peer = {
  displayName?: string | null;
  avatarUrl?: string | null;
  online?: boolean | null;
};

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
  online?: boolean;
  title: string;
  preview: string;
  previewMissed?: boolean;
  date: string | null;
  unreadCount: number;
};

function Avatar({
  name,
  url,
  size = 48,
  online,
}: {
  name: string;
  url?: string | null;
  size?: number;
  online?: boolean;
}) {
  const colors = useOptionalTheme()?.colors ?? lightColors;
  const src = url ? mediaUrl(url) : "";
  return (
    <View style={{ width: size, height: size }}>
      {src ? (
        <Image
          source={{ uri: src }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.accentSoft,
          }}
        />
      ) : (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.accentSoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: colors.foreground,
              fontWeight: "700",
              fontSize: size * 0.38,
            }}
          >
            {(name || "R").slice(0, 1).toUpperCase()}
          </Text>
        </View>
      )}
      {online ? (
        <View
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: "#22c55e",
            borderWidth: 2,
            borderColor: colors.surface,
          }}
        />
      ) : null}
    </View>
  );
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
  const [statuses, setStatuses] = useState<MemberStatusItem[]>([]);
  const [myStatus, setMyStatus] = useState<MemberStatusItem | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [dm, bookingsRes, payRes, statusRes] = await Promise.all([
        api<{ threads?: DmThread[] }>("/api/dm"),
        api<{ bookings?: Booking[] }>("/api/bookings"),
        api<{ payments?: ServicePayment[] }>("/api/service-payments").catch(
          () => ({ payments: [] as ServicePayment[] })
        ),
        api<{
          statuses?: MemberStatusItem[];
          mine?: MemberStatusItem | null;
        }>("/api/status").catch(() =>
          api<{
            statuses?: MemberStatusItem[];
            mine?: MemberStatusItem | null;
          }>("/api/member-status").catch(() => ({
            statuses: [] as MemberStatusItem[],
            mine: null,
          }))
        ),
      ]);
      setStatuses(statusRes.statuses ?? []);
      setMyStatus(statusRes.mine ?? null);

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
          online: Boolean(other?.online),
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
          online: Boolean(th.peer?.online),
          title: th.peer?.displayName || "Contact",
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
          online: Boolean(peer?.online),
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.preview.toLowerCase().includes(q)
    );
  }, [rows, query]);

  async function pickAndPublishStatus() {
    if (publishing) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError(t("messages_status_failed"));
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.85,
      videoMaxDuration: MEMBER_STATUS_VIDEO_MAX_SEC,
      allowsEditing: false,
    });
    if (picked.canceled || !picked.assets?.[0]) return;
    const asset = picked.assets[0];
    const isVideo = (asset.type || "").includes("video");
    if (
      isVideo &&
      typeof asset.duration === "number" &&
      asset.duration > MEMBER_STATUS_VIDEO_MAX_SEC * 1000
    ) {
      Alert.alert(t("messages_title"), t("messages_status_video_too_long"));
      return;
    }
    const ext =
      asset.fileName?.split(".").pop() ||
      (isVideo ? "mp4" : "jpg");
    const mime =
      asset.mimeType ||
      (isVideo ? "video/mp4" : "image/jpeg");
    setPublishing(true);
    setError("");
    try {
      const uploaded = await uploadFile("/api/community/upload", {
        uri: asset.uri,
        name: asset.fileName || `status.${ext}`,
        type: mime,
      });
      const payload = {
        kind: "STORY",
        mediaUrl: uploaded.url,
        mediaType: isVideo ? "video" : "image",
        mirrorCommunity: true,
      };
      try {
        await api("/api/status", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } catch (first) {
        const msg = first instanceof Error ? first.message : "";
        if (msg.includes("404") || msg.includes("Erreur 404")) {
          await api("/api/member-status", {
            method: "POST",
            body: JSON.stringify(payload),
          });
        } else {
          throw first;
        }
      }
      Alert.alert(t("messages_title"), t("messages_status_published"));
      await load();
    } catch (e) {
      const raw = e instanceof Error ? e.message : "";
      setError(
        raw
          ? raw.includes("404")
            ? `${t("messages_status_failed")} (404)`
            : raw
          : t("messages_status_failed")
      );
    } finally {
      setPublishing(false);
    }
  }

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

  const others = statuses.filter((s) => !s.mine).slice(0, 12);

  return (
    <Screen style={{ paddingBottom: 8, paddingTop: 4 }}>
      <FlatList
        style={{ flex: 1 }}
        data={filtered}
        keyExtractor={(item) => item.key}
        refreshing={loading}
        onRefresh={() => void load()}
        contentContainerStyle={{ paddingBottom: 28, flexGrow: 1 }}
        ListHeaderComponent={
          <View style={{ gap: 14, marginBottom: 6 }}>
            <View>
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: "800",
                  color: colors.greenDark,
                  letterSpacing: -0.4,
                }}
              >
                {t("messages_title")}
              </Text>
              <Text style={{ color: colors.muted, marginTop: 2, fontSize: 14 }}>
                {t("messages_subtitle")}
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingVertical: 2 }}
            >
              <Pressable
                onPress={() => void pickAndPublishStatus()}
                disabled={publishing}
                style={{
                  width: 108,
                  height: 148,
                  borderRadius: 18,
                  overflow: "hidden",
                  backgroundColor: colors.accentSoft,
                  borderWidth: 1,
                  borderColor: colors.border,
                  opacity: publishing ? 0.7 : 1,
                }}
              >
                {myStatus?.mediaUrl && !isStatusVideoUrl(myStatus.mediaUrl) ? (
                  <Image
                    source={{ uri: mediaUrl(myStatus.mediaUrl) }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                ) : user?.avatarUrl ? (
                  <Image
                    source={{ uri: mediaUrl(user.avatarUrl) }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={{
                      flex: 1,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: colors.accent,
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 36, fontWeight: "700" }}>
                      {(user?.displayName || "R").slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                )}
                {myStatus?.mediaUrl && isStatusVideoUrl(myStatus.mediaUrl) ? (
                  <View
                    style={{
                      position: "absolute",
                      top: 8,
                      left: 8,
                      backgroundColor: "rgba(0,0,0,0.5)",
                      borderRadius: 10,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 11 }}>▶</Text>
                  </View>
                ) : null}
                <View
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    padding: 8,
                    backgroundColor: "rgba(27,59,20,0.55)",
                  }}
                >
                  <Text
                    style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}
                    numberOfLines={1}
                  >
                    {myStatus ? t("status_kind_story") : t("messages_my_status")}
                  </Text>
                </View>
                <View
                  style={{
                    position: "absolute",
                    right: 8,
                    bottom: 34,
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: colors.accent,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 2,
                    borderColor: "#fff",
                  }}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                </View>
              </Pressable>

              {others.map((s) => {
                const name = s.author?.displayName || "—";
                const photo = s.mediaUrl || s.author?.avatarUrl;
                return (
                  <View
                    key={s.id}
                    style={{
                      width: 108,
                      height: 148,
                      borderRadius: 18,
                      overflow: "hidden",
                      backgroundColor: colors.surface2,
                    }}
                  >
                    {photo ? (
                      <Image
                        source={{ uri: mediaUrl(photo) }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={{
                          flex: 1,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: colors.accentSoft,
                        }}
                      >
                        <Text style={{ fontSize: 32, fontWeight: "700", color: colors.accent }}>
                          {name.slice(0, 1).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        backgroundColor: "rgba(0,0,0,0.45)",
                        borderRadius: 10,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                      }}
                    >
                      <Text style={{ color: "#fff", fontSize: 12 }}>
                        {statusEmoji(s.kind)}
                      </Text>
                    </View>
                    <View
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        padding: 8,
                        backgroundColor: "rgba(27,59,20,0.55)",
                      }}
                    >
                      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }} numberOfLines={1}>
                        {t(statusLabelKey(s.kind))}
                      </Text>
                      <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 11 }} numberOfLines={1}>
                        {name}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: colors.surface2,
                borderRadius: 14,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              <Ionicons name="search" size={18} color={colors.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t("messages_search_placeholder")}
                placeholderTextColor={colors.muted}
                style={{
                  flex: 1,
                  color: colors.foreground,
                  fontSize: 15,
                  padding: 0,
                }}
              />
            </View>

            <Muted>{t("messages_status_pick")}</Muted>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ fontWeight: "800", fontSize: 17, color: colors.foreground }}>
                {t("messages_conversations")}
              </Text>
              <Pressable onPress={pickStoreAndShare}>
                <Text style={{ color: colors.accent, fontWeight: "700", fontSize: 13 }}>
                  {t("invite_contacts_share_link")} ›
                </Text>
              </Pressable>
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
            <Pressable
              onPress={() => router.push(item.href)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <Avatar
                name={item.name}
                url={item.avatarUrl}
                online={item.online}
              />
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
                    numberOfLines={1}
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
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}
