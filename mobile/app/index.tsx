import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { WelcomeHome } from "@/components/welcome-home";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/theme";

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.accent,
        }}
      >
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (user) return <Redirect href="/(tabs)" />;
  return <WelcomeHome />;
}
