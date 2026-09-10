import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { type Href, useFocusEffect, useRouter } from "expo-router";
import { CoverBanner } from "@/components/cover-banner";
import { Button, Card, ErrorText } from "@/components/ui";
import { api, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { bookingStatusLabel, useI18n } from "@/lib/i18n";
import { useOptionalTheme } from "@/lib/theme-context";
import { colors as lightColors } from "@/lib/theme";

type Booking = {
  id: string;
  status: string;
  request?: { fromCity?: string | null; toCity?: string | null; weightKg?: number | null } | null;
  trip?: { fromCity?: string | null; toCity?: string | null; weightKg?: number | null } | null;
};

export default function HomeScreen() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const colors = useOptionalTheme()?.colors ?? lightColors;
  const router = useRouter();
  const [tripsCount, setTripsCount] = useState(0);
  const [requestsCount, setRequestsCount] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError("");
    try {
      const [tripsRes, requestsRes, bookingsRes] = await Promise.all([
        api<{ trips?: { id: string }[] }>("/api/trips?mine=1"),
        api<{ requests?: { id: string }[] }>("/api/requests?mine=1"),
        api<{ bookings?: Booking[] }>("/api/bookings"),
      ]);
      setTripsCount(tripsRes.trips?.length ?? 0);
      setRequestsCount(requestsRes.requests?.length ?? 0);
      const recent = (bookingsRes.bookings ?? [])
        .filter((b) => b.status !== "CANCELLED" && b.status !== "REFUSED")
        .slice(0, 5);
      setBookings(recent);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const rating =
    user?.ratingCount && user.ratingCount > 0 && user.ratingAvg != null
      ? user.ratingAvg.toFixed(1)
      : "—";
  const avatar = user?.avatarUrl ? mediaUrl(user.avatarUrl) : "";
  const initial = (user?.displayName || "R").slice(0, 1).toUpperCase();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 24 }}
    >
      <View style={{ alignItems: "center" }}>
        <CoverBanner customUrl={user?.bannerUrl} />
        <Pressable
          onPress={() => router.push("/(tabs)/profile")}
          style={{ marginTop: 16, alignItems: "center" }}
        >
          {avatar ? (
            <Image
              source={{ uri: avatar }}
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: colors.accentSoft,
              }}
            />
          ) : (
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: colors.accentSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: colors.accent, fontWeight: "700", fontSize: 22 }}>
                {initial}
              </Text>
            </View>
          )}
        </Pressable>
        <Text
          style={{
            marginTop: 12,
            fontSize: 24,
            fontWeight: "800",
            color: colors.accent,
            textAlign: "center",
          }}
        >
          {t("hello")}, {user?.displayName ?? ""}
        </Text>
        {user?.kycStatus === "VERIFIED" ? (
          <Text style={{ marginTop: 4, color: colors.accentHover, fontWeight: "600" }}>
            {t("verified")}
          </Text>
        ) : null}
        <Text
          style={{
            marginTop: 6,
            color: colors.muted,
            fontSize: 14,
            textAlign: "center",
          }}
        >
          {t("dashboard_subtitle")}
        </Text>
        <Text
          style={{
            marginTop: 4,
            color: colors.muted,
            fontSize: 12,
            textAlign: "center",
          }}
        >
          {t("dashboard_actors_hint")}
        </Text>
      </View>

      <View style={{ gap: 10 }}>
        <Button
          label={t("dashboard_publish_service")}
          variant="outline"
          onPress={() => router.push("/service/new")}
        />
        <Button
          label={t("dashboard_search_service")}
          variant="outline"
          onPress={() => router.push("/services")}
        />
        <Button
          label={t("my_projects_title")}
          variant="outline"
          onPress={() => router.push("/projects")}
        />
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(
          [
            ["/(tabs)/trips", t("browse_trips")],
            ["/(tabs)/requests", t("browse_requests")],
            ["/services", t("browse_services")],
            ["/(tabs)/shops", t("browse_shops")],
            ["/meet", t("browse_meet")],
            ["/herald", t("ambassador_become_cta")],
            ...(user?.role === "ADMIN"
              ? [["/admin", t("admin_open_cta")] as [string, string]]
              : []),
          ] as [string, string][]
        ).map(([href, label]) => (
          <Pressable
            key={href}
            onPress={() => router.push(href as Href)}
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text style={{ color: colors.accent, fontWeight: "700", fontSize: 13 }}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? <ErrorText>{error}</ErrorText> : null}
      {loading ? (
        <View style={{ alignItems: "center", paddingVertical: 16 }}>
          <ActivityIndicator color={colors.accent} />
          <Text style={{ color: colors.muted, marginTop: 8 }}>{t("dashboard_loading")}</Text>
        </View>
      ) : (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <KpiCard
            label={t("open_trips")}
            value={String(tripsCount)}
            onPress={() => router.push("/(tabs)/trips")}
          />
          <KpiCard
            label={t("open_requests")}
            value={String(requestsCount)}
            onPress={() => router.push("/(tabs)/requests")}
          />
          <KpiCard label={t("avg_rating")} value={rating} />
        </View>
      )}

      <View>
        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: colors.accent,
            marginBottom: 12,
          }}
        >
          {t("recent_activity")}
        </Text>
        {bookings.length === 0 ? (
          <Text style={{ color: colors.muted, fontSize: 14 }}>
            {t("no_recent_activity")}
          </Text>
        ) : (
          bookings.map((booking) => {
            const from =
              booking.request?.fromCity || booking.trip?.fromCity || "?";
            const to = booking.request?.toCity || booking.trip?.toCity || "?";
            const weight = booking.request?.weightKg ?? booking.trip?.weightKg;
            return (
              <Card key={booking.id}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontWeight: "700",
                        fontSize: 16,
                        color: colors.foreground,
                      }}
                    >
                      {from} → {to}
                    </Text>
                    <Text style={{ color: colors.muted, marginTop: 4 }}>
                      {[
                        weight != null ? `${weight}kg` : null,
                        bookingStatusLabel(locale, booking.status),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => router.push(`/booking/${booking.id}`)}
                    style={{
                      backgroundColor: colors.accent,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ color: colors.white, fontWeight: "700", fontSize: 12 }}>
                      {t("open")}
                    </Text>
                  </Pressable>
                </View>
              </Card>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

function KpiCard({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const colors = useOptionalTheme()?.colors ?? lightColors;
  const inner = (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 12,
      }}
    >
      <Text style={{ fontSize: 11, color: colors.muted }}>{label}</Text>
      <Text
        style={{
          fontSize: 24,
          fontWeight: "800",
          color: colors.accent,
          marginTop: 4,
        }}
      >
        {value}
      </Text>
    </View>
  );
  if (!onPress) return inner;
  return (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      {inner}
    </Pressable>
  );
}
