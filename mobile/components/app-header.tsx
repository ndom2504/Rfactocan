import { Image, Pressable, Text, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LocaleToggle } from "@/components/locale-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { useAuth } from "@/lib/auth-context";
import { mediaUrl } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useOptionalTheme } from "@/lib/theme-context";
import { colors as lightColors } from "@/lib/theme";

/** Material 3 small TopAppBar height — same as Android `TopAppBar`. */
const BAR_HEIGHT = 64;

export function AppHeader() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
  const colors = useOptionalTheme()?.colors ?? lightColors;
  const initial = (user?.displayName || "R").slice(0, 1).toUpperCase();
  const avatar = user?.avatarUrl ? mediaUrl(user.avatarUrl) : "";

  return (
    <View
      style={{
        paddingTop: insets.top,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View
        style={{
          height: BAR_HEIGHT,
          paddingHorizontal: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Pressable
          onPress={() => router.push("/(tabs)/profile")}
          style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}
          accessibilityLabel={t("nav_profile")}
        >
          {avatar ? (
            <Image
              source={{ uri: avatar }}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accentSoft }}
            />
          ) : (
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: colors.accentSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: colors.accent, fontWeight: "700" }}>{initial}</Text>
            </View>
          )}
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: colors.accent,
            }}
          >
            Rfacto
          </Text>
        </Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <LocaleToggle />
          <NotificationBell />
          <Pressable
            onPress={() => router.push("/(tabs)/settings")}
            hitSlop={8}
            style={{ padding: 6 }}
            accessibilityLabel={t("nav_settings")}
          >
            <FontAwesome name="cog" size={20} color={colors.accent} />
          </Pressable>
          <Pressable
            onPress={() => router.push("/(tabs)/bookings")}
            hitSlop={8}
            style={{ padding: 6 }}
            accessibilityLabel={t("nav_bookings")}
          >
            <FontAwesome name="calendar" size={18} color={colors.accent} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
