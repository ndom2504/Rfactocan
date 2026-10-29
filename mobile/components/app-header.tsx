import { useRef } from "react";
import { Image, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AccountMenu } from "@/components/account-menu";
import { LocaleToggle } from "@/components/locale-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { useAuth } from "@/lib/auth-context";
import { mediaUrl } from "@/lib/api";
import { useOptionalTheme } from "@/lib/theme-context";
import { colors as lightColors } from "@/lib/theme";

/** Material 3 small TopAppBar height — same as Android `TopAppBar`. */
const BAR_HEIGHT = 64;

export function AppHeader() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const colors = useOptionalTheme()?.colors ?? lightColors;
  const initial = (user?.displayName || "R").slice(0, 1).toUpperCase();
  const avatar = user?.avatarUrl ? mediaUrl(user.avatarUrl) : "";
  const stickyAvatar = useRef(avatar);
  if (avatar) stickyAvatar.current = avatar;
  const shownAvatar = user ? avatar || stickyAvatar.current : "";

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
        <View
          style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}
        >
          <AccountMenu size={36}>
            {shownAvatar ? (
              <Image
                source={{ uri: shownAvatar }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: colors.accentSoft,
                }}
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
                <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                  {initial}
                </Text>
              </View>
            )}
          </AccountMenu>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: colors.foreground,
            }}
          >
            Rfacto
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <LocaleToggle />
          <NotificationBell />
        </View>
      </View>
    </View>
  );
}
