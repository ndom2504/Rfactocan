import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";
import { AppHeader } from "@/components/app-header";
import { useInboxUnread } from "@/lib/inbox-unread";
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
  const messageUnread = useInboxUnread();
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
        name="bookings"
        options={{
          title: t("nav_bookings"),
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="calendar"
              color={focused ? colors.accent : colors.muted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: t("nav_messages"),
          tabBarBadge: messageUnread > 0 ? (messageUnread > 9 ? "9+" : messageUnread) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: "#E65100",
            color: "#fff",
            fontSize: 10,
            fontWeight: "800",
            minWidth: 16,
            height: 16,
            lineHeight: 16,
          },
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="comments"
              color={focused ? colors.accent : colors.muted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="calls"
        options={{
          title: t("nav_calls"),
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="phone"
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
    </Tabs>
  );
}
