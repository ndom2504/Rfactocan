import Ionicons from "@expo/vector-icons/Ionicons";
import { type Href, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";
import { useCallActions } from "@/components/call-provider";
import { Card, ErrorText, Muted, Screen, Title } from "@/components/ui";
import { mediaUrl } from "@/lib/api";
import {
  callStatusPreviewKey,
  createOutgoingCall,
  listCalls,
  type CallHistoryItem,
} from "@/lib/calls";
import { formatChatListTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useOptionalTheme } from "@/lib/theme-context";
import { colors as lightColors } from "@/lib/theme";

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

function directionIcon(item: CallHistoryItem): {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
} {
  const missed =
    item.missed || (item.status || "").toUpperCase() === "MISSED";
  if (missed) return { name: "close-circle", color: "#DC2626" };
  if (item.direction === "outbound") {
    return { name: "arrow-up", color: "#16A34A" };
  }
  return { name: "arrow-down", color: "#16A34A" };
}

export default function CallsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const colors = useOptionalTheme()?.colors ?? lightColors;
  const { startOutgoing } = useCallActions();
  const [items, setItems] = useState<CallHistoryItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [callingId, setCallingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const calls = await listCalls(50);
      setItems(calls);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function redial(item: CallHistoryItem) {
    if (!item.threadId || callingId) return;
    setCallingId(item.id);
    try {
      const call = await createOutgoingCall(
        item.threadId,
        item.mediaType === "VIDEO" ? "VIDEO" : "AUDIO"
      );
      startOutgoing({
        ...call,
        direction: "outbound",
        peer: call.peer || item.peer,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("call_failed"));
    } finally {
      setCallingId(null);
    }
  }

  function openThread(item: CallHistoryItem) {
    if (item.threadId) {
      router.push(`/messages/${item.threadId}` as Href);
      return;
    }
    void redial(item);
  }

  return (
    <Screen style={{ paddingBottom: 8 }}>
      <FlatList
        style={{ flex: 1 }}
        data={items}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={() => void load()}
        contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 8 }}>
            <Title>{t("calls_title")}</Title>
            <Muted>{t("calls_subtitle")}</Muted>
            <ErrorText>{error}</ErrorText>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
          ) : (
            <Muted>{t("calls_empty")}</Muted>
          )
        }
        renderItem={({ item }) => {
          const name = item.peer?.displayName?.trim() || "Contact";
          const missed =
            item.missed || (item.status || "").toUpperCase() === "MISSED";
          const icon = directionIcon(item);
          const statusKey = callStatusPreviewKey(item);
          const statusLabel = t(statusKey);
          return (
            <Pressable onPress={() => openThread(item)}>
              <Card>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <Avatar name={name} url={item.peer?.avatarUrl} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={{
                        fontWeight: "700",
                        fontSize: 15,
                        color: missed ? "#DC2626" : colors.foreground,
                      }}
                      numberOfLines={1}
                    >
                      {name}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 2,
                      }}
                    >
                      <Ionicons name={icon.name} size={14} color={icon.color} />
                      <Text
                        style={{
                          color: missed ? "#DC2626" : colors.muted,
                          fontSize: 13,
                          flexShrink: 1,
                        }}
                        numberOfLines={1}
                      >
                        {statusLabel}
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 8 }}>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>
                      {formatChatListTime(item.createdAt)}
                    </Text>
                    <Pressable
                      onPress={() => void redial(item)}
                      hitSlop={8}
                      disabled={callingId === item.id}
                      accessibilityLabel={t("call_redial")}
                      style={{ opacity: callingId === item.id ? 0.4 : 1 }}
                    >
                      <Ionicons name="call" size={18} color={colors.accent} />
                    </Pressable>
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
