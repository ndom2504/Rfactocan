import {
  type Href,
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Button, Card, ErrorText, Muted, Screen, Title } from "@/components/ui";
import { api, mediaUrl } from "@/lib/api";
import { startDirectChat } from "@/lib/dm";
import { formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useOptionalTheme } from "@/lib/theme-context";
import { colors as lightColors } from "@/lib/theme";

type MemberUser = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  country: string | null;
  verified: boolean;
  ratingAvg: number;
  ratingCount: number;
  completedDeliveries: number;
  createdAt: string;
  isOwner: boolean;
  connectionCount: number;
  connectedByMe: boolean;
};

type MemberConnection = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  verified?: boolean;
};

type MemberData = {
  user: MemberUser;
  stats: {
    connections: number;
    deliveries: number;
    ratingAvg: number;
    ratingCount: number;
    trips: number;
    services: number;
    shops: number;
    parcels: number;
  };
  connections: MemberConnection[];
  projects: {
    trips: {
      id: string;
      fromCity: string;
      toCity: string;
      departAt: string;
    }[];
    services: { id: string; title: string; city?: string; country?: string }[];
    shops: { id: string; name: string; city?: string; country?: string }[];
    parcels: {
      id: string;
      fromCity: string;
      toCity: string;
      desiredDate?: string | null;
    }[];
  };
};

function Stat({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  const colors = useOptionalTheme()?.colors ?? lightColors;
  return (
    <View style={{ flex: 1, minWidth: 72, alignItems: "center", paddingVertical: 8 }}>
      <Text style={{ fontWeight: "800", fontSize: 18, color: colors.foreground }}>
        {value}
      </Text>
      <Text style={{ fontSize: 11, color: colors.muted, textAlign: "center" }}>
        {label}
      </Text>
    </View>
  );
}

function MiniAvatar({
  name,
  url,
  size = 48,
}: {
  name: string;
  url?: string | null;
  size?: number;
}) {
  const colors = useOptionalTheme()?.colors ?? lightColors;
  const src = url ? mediaUrl(url) : "";
  if (src) {
    return (
      <Image
        source={{ uri: src }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.accentSoft,
        }}
      />
    );
  }
  return (
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
          color: colors.accent,
          fontWeight: "700",
          fontSize: size > 56 ? 28 : 18,
        }}
      >
        {(name || "R").slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}

export default function MemberProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const colors = useOptionalTheme()?.colors ?? lightColors;
  const [data, setData] = useState<MemberData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"connect" | "message" | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError("");
    try {
      const json = await api<MemberData>(`/api/members/${id}`);
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function toggleConnect() {
    if (!data || data.user.isOwner) return;
    setBusy("connect");
    setError("");
    try {
      const connected = data.user.connectedByMe;
      const result = await api<{ connected?: boolean; connectionCount?: number }>(
        connected
          ? `/api/connections?userId=${encodeURIComponent(data.user.id)}`
          : "/api/connections",
        connected
          ? { method: "DELETE" }
          : { method: "POST", body: JSON.stringify({ userId: data.user.id }) }
      );
      setData((prev) =>
        prev
          ? {
              ...prev,
              user: {
                ...prev.user,
                connectedByMe: Boolean(result.connected),
                connectionCount:
                  typeof result.connectionCount === "number"
                    ? result.connectionCount
                    : prev.user.connectionCount,
              },
              stats: {
                ...prev.stats,
                connections:
                  typeof result.connectionCount === "number"
                    ? result.connectionCount
                    : prev.stats.connections,
              },
            }
          : prev
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setBusy(null);
    }
  }

  async function openMessage() {
    if (!data || data.user.isOwner) return;
    setBusy("message");
    setError("");
    try {
      const threadId = await startDirectChat({ toUserId: data.user.id });
      if (threadId) router.push(`/messages/${threadId}` as Href);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setBusy(null);
    }
  }

  const user = data?.user;
  const projects = data?.projects;
  const emptyProjects =
    !projects ||
    (projects.trips.length === 0 &&
      projects.services.length === 0 &&
      projects.shops.length === 0 &&
      projects.parcels.length === 0);

  return (
    <Screen style={{ padding: 0 }}>
      <Stack.Screen
        options={{
          title: user?.displayName || t("member_profile_title"),
          headerTintColor: colors.accent,
          headerStyle: { backgroundColor: colors.surface },
        }}
      />
      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          <View
            style={{
              height: 140,
              backgroundColor: colors.surface2,
              overflow: "hidden",
            }}
          >
            {user?.bannerUrl ? (
              <Image
                source={{ uri: mediaUrl(user.bannerUrl) }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            ) : null}
          </View>
          <View style={{ paddingHorizontal: 16, marginTop: -36 }}>
            <MiniAvatar name={user?.displayName || "R"} url={user?.avatarUrl} size={80} />
            <Title>{user?.displayName || t("member_profile_title")}</Title>
            {user?.verified ? (
              <Text style={{ color: colors.accent, fontWeight: "700", marginBottom: 4 }}>
                {t("verified")}
              </Text>
            ) : null}
            {user?.country ? <Muted>{user.country}</Muted> : null}
            {user?.bio ? (
              <Text style={{ color: colors.foreground, marginTop: 8, lineHeight: 20 }}>
                {user.bio}
              </Text>
            ) : null}
            {user?.createdAt ? (
              <Muted>
                {t("member_since")} {formatDate(user.createdAt)}
              </Muted>
            ) : null}

            <ErrorText>{error}</ErrorText>

            {user?.isOwner ? (
              <View style={{ marginTop: 12 }}>
                <Button
                  label={t("member_edit_profile")}
                  variant="outline"
                  onPress={() => router.push("/(tabs)/profile")}
                />
              </View>
            ) : (
              <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    label={
                      user?.connectedByMe
                        ? t("community_connected")
                        : t("community_connect")
                    }
                    variant={user?.connectedByMe ? "outline" : "primary"}
                    onPress={() => void toggleConnect()}
                    loading={busy === "connect"}
                    disabled={busy === "message"}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label={t("community_contact")}
                    variant="outline"
                    onPress={() => void openMessage()}
                    loading={busy === "message"}
                    disabled={busy === "connect"}
                  />
                </View>
              </View>
            )}

            <Text
              style={{
                fontWeight: "700",
                fontSize: 16,
                color: colors.foreground,
                marginTop: 20,
                marginBottom: 8,
              }}
            >
              {t("member_performance")}
            </Text>
            <Card>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                <Stat
                  value={
                    data
                      ? data.stats.ratingCount
                        ? data.stats.ratingAvg.toFixed(1)
                        : "—"
                      : "—"
                  }
                  label={t("member_rating")}
                />
                <Stat
                  value={String(data?.stats.deliveries ?? 0)}
                  label={t("member_deliveries")}
                />
                <Stat
                  value={String(data?.stats.connections ?? 0)}
                  label={t("community_connections")}
                />
                <Stat
                  value={String(
                    (data?.stats.trips ?? 0) +
                      (data?.stats.services ?? 0) +
                      (data?.stats.shops ?? 0)
                  )}
                  label={t("member_projects")}
                />
              </View>
            </Card>

            <Text
              style={{
                fontWeight: "700",
                fontSize: 16,
                color: colors.foreground,
                marginTop: 20,
                marginBottom: 8,
              }}
            >
              {t("member_connections")}
            </Text>
            {data?.connections.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {data.connections.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => router.push(`/member/${c.id}` as Href)}
                    style={{ alignItems: "center", width: 72, marginRight: 10 }}
                  >
                    <MiniAvatar name={c.displayName} url={c.avatarUrl} />
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: 11,
                        color: colors.foreground,
                        marginTop: 4,
                        textAlign: "center",
                      }}
                    >
                      {c.displayName}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <Muted>{t("member_no_connections")}</Muted>
            )}

            <Text
              style={{
                fontWeight: "700",
                fontSize: 16,
                color: colors.foreground,
                marginTop: 20,
                marginBottom: 8,
              }}
            >
              {t("member_projects")}
            </Text>
            {emptyProjects ? <Muted>{t("member_no_projects")}</Muted> : null}

            {projects?.trips.map((trip) => (
              <Pressable
                key={trip.id}
                onPress={() => router.push(`/trip/${trip.id}` as Href)}
              >
                <Card>
                  <Text style={{ fontWeight: "700", color: colors.foreground }}>
                    {trip.fromCity} → {trip.toCity}
                  </Text>
                  <Muted>
                    {t("member_trips")} · {formatDate(trip.departAt)}
                  </Muted>
                </Card>
              </Pressable>
            ))}
            {projects?.parcels.map((parcel) => (
              <Pressable
                key={parcel.id}
                onPress={() => router.push(`/request/${parcel.id}` as Href)}
              >
                <Card>
                  <Text style={{ fontWeight: "700", color: colors.foreground }}>
                    {parcel.fromCity} → {parcel.toCity}
                  </Text>
                  <Muted>
                    {t("member_parcels")}
                    {parcel.desiredDate ? ` · ${formatDate(parcel.desiredDate)}` : ""}
                  </Muted>
                </Card>
              </Pressable>
            ))}
            {projects?.services.map((svc) => (
              <Pressable
                key={svc.id}
                onPress={() => router.push(`/service/${svc.id}` as Href)}
              >
                <Card>
                  <Text style={{ fontWeight: "700", color: colors.foreground }}>
                    {svc.title}
                  </Text>
                  <Muted>
                    {t("member_services")}
                    {svc.city ? ` · ${svc.city}` : ""}
                  </Muted>
                </Card>
              </Pressable>
            ))}
            {projects?.shops.map((shop) => (
              <Pressable
                key={shop.id}
                onPress={() => router.push(`/shops/${shop.id}` as Href)}
              >
                <Card>
                  <Text style={{ fontWeight: "700", color: colors.foreground }}>
                    {shop.name}
                  </Text>
                  <Muted>
                    {t("member_shops")}
                    {shop.city ? ` · ${shop.city}` : ""}
                  </Muted>
                </Card>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}
