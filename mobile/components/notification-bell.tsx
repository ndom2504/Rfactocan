import { useCallback, useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter, type Href } from "expo-router";
import { api } from "@/lib/api";
import { onPushReceived } from "@/lib/push";
import { useI18n } from "@/lib/i18n";
import { colors } from "@/lib/theme";

type Item = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  type?: string;
  readAt: string | null;
  createdAt: string;
};

function hrefToRoute(href: string): Href | null {
  const booking = /\/bookings\/([^/?#]+)/.exec(href);
  if (booking) return `/booking/${booking[1]}`;
  const trip = /\/trips\/([^/?#]+)/.exec(href);
  if (trip) return `/trip/${trip[1]}`;
  const request = /\/requests\/([^/?#]+)/.exec(href);
  if (request) return `/request/${request[1]}`;
  const community = /\/community\/([^/?#]+)/.exec(href);
  if (community) return `/community/${community[1]}`;
  if (href.includes("/messages")) return "/(tabs)/messages";
  if (href.includes("/community")) return "/(tabs)/community";
  if (href.includes("/dashboard") || href.includes("/profile")) {
    return href.includes("/profile") ? "/(tabs)/profile" : "/(tabs)";
  }
  return null;
}

export function NotificationBell() {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const data = await api<{ notifications?: Item[]; unread?: number }>(
        "/api/notifications"
      );
      setItems(data.notifications ?? []);
      setUnread(data.unread ?? 0);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 45000);
    const stop = onPushReceived(() => void load());
    return () => {
      clearInterval(id);
      stop();
    };
  }, [load]);

  async function markRead(ids?: string[]) {
    try {
      await api("/api/notifications", {
        method: "PATCH",
        body: JSON.stringify(ids ? { ids } : { all: true }),
      });
      await load();
    } catch {
      /* ignore */
    }
  }

  function openItem(item: Item) {
    void markRead([item.id]);
    setOpen(false);
    const href = item.href ?? "";
    const route = href ? hrefToRoute(href) : null;
    if (route) {
      router.push(route);
      return;
    }
    if (item.type === "MESSAGE") router.push("/(tabs)/messages");
  }

  return (
    <>
      <Pressable
        onPress={() => {
          setOpen(true);
          void load();
        }}
        hitSlop={8}
        style={{ padding: 6 }}
        accessibilityLabel={t("notifications")}
      >
        <View>
          <FontAwesome name="bell" size={20} color={colors.accent} />
          {unread > 0 ? (
            <View
              style={{
                position: "absolute",
                top: -6,
                right: -8,
                minWidth: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: "#E65100",
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 3,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>
                {unread > 9 ? "9+" : unread}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 48 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingBottom: 12,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: colors.foreground,
              }}
            >
              {t("notifications")}
            </Text>
            {unread > 0 ? (
              <Pressable onPress={() => void markRead()}>
                <Text style={{ color: colors.accent, fontWeight: "600" }}>
                  {t("mark_all_read")}
                </Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => setOpen(false)}>
                <Text style={{ color: colors.accent, fontWeight: "600" }}>
                  {t("close")}
                </Text>
              </Pressable>
            )}
          </View>
          {items.length === 0 ? (
            <Text
              style={{
                color: colors.muted,
                paddingHorizontal: 16,
                marginTop: 12,
              }}
            >
              {t("no_notifications")}
            </Text>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
              {items.map((item) => {
                const isUnread = !item.readAt;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => openItem(item)}
                    style={{
                      backgroundColor: isUnread
                        ? colors.accentSoft
                        : colors.surface,
                      borderRadius: 12,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: "700",
                        color: colors.foreground,
                        marginBottom: 4,
                      }}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Text
                      style={{ color: colors.muted, fontSize: 13 }}
                      numberOfLines={2}
                    >
                      {item.body}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
          {unread > 0 ? (
            <Pressable
              onPress={() => setOpen(false)}
              style={{ padding: 16, alignItems: "center" }}
            >
              <Text style={{ color: colors.accent, fontWeight: "600" }}>
                {t("close")}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </Modal>
    </>
  );
}
