import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";
import { AppHeader } from "@/components/app-header";
import { useI18n } from "@/lib/i18n";
import { useOptionalTheme } from "@/lib/theme-context";
import { colors as lightColors } from "@/lib/theme";

function TabIcon({
  name,
  color,
}: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={22} style={{ marginBottom: -2 }} name={name} color={color} />;
}

export default function TabLayout() {
  const { t } = useI18n();
  const colors = useOptionalTheme()?.colors ?? lightColors;
  return (
    <Tabs
      screenOptions={{
        header: () => <AppHeader />,
        tabBarActiveTintColor: colors.foreground,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("nav_home"),
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="home"
              color={focused ? colors.accent : colors.muted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: t("nav_community"),
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="group"
              color={focused ? colors.accent : colors.muted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="announce"
        options={{ href: null, title: t("nav_announce") }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: t("nav_messages"),
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="comments"
              color={focused ? colors.accent : colors.muted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="actions"
        options={{ href: null, title: t("publish_listing_cta") }}
      />
      <Tabs.Screen
        name="shops"
        options={{ href: null, title: "Boutiques" }}
      />
      <Tabs.Screen name="trips" options={{ href: null, title: "Voyages" }} />
      <Tabs.Screen name="requests" options={{ href: null, title: "Demandes" }} />
      <Tabs.Screen
        name="bookings"
        options={{ href: null, title: t("nav_bookings") }}
      />
      <Tabs.Screen name="profile" options={{ href: null, title: t("nav_profile") }} />
      <Tabs.Screen name="settings" options={{ href: null, title: t("nav_settings") }} />
    </Tabs>
  );
}
