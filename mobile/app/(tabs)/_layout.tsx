import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";
import { colors } from "@/lib/theme";

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
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Accueil",
          tabBarIcon: ({ color }) => (
            <TabIcon name="home" color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="actions"
        options={{
          title: "Actions",
          tabBarIcon: ({ color }) => (
            <TabIcon name="th-large" color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Communauté",
          tabBarIcon: ({ color }) => (
            <TabIcon name="group" color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color }) => (
            <TabIcon name="comments" color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="shops"
        options={{
          title: "Boutiques",
          tabBarIcon: ({ color }) => (
            <TabIcon name="shopping-cart" color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen name="trips" options={{ href: null, title: "Voyages" }} />
      <Tabs.Screen name="requests" options={{ href: null, title: "Demandes" }} />
      <Tabs.Screen
        name="bookings"
        options={{ href: null, title: "Réservations" }}
      />
      <Tabs.Screen name="profile" options={{ href: null, title: "Profil" }} />
    </Tabs>
  );
}
