import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { PresenceHeartbeat } from "@/components/presence-heartbeat";
import { VideoSplash } from "@/components/video-splash";
import { CallProvider } from "@/components/call-provider";
import { GoogleReturnHandler } from "@/components/google-return-handler";
import { GuidedTour } from "@/components/guided-tour";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { LocaleProvider } from "@/lib/i18n";
import { ThemeProvider, useTheme } from "@/lib/theme-context";
import { setupLivekitGlobals } from "@/lib/calls";
import { watchPushNotifications } from "@/lib/push";
import { colors } from "@/lib/theme";

export { ErrorBoundary } from "expo-router";

try {
  setupLivekitGlobals();
} catch {
  /* Expo Go has no WebRTC */
}

void SplashScreen.preventAutoHideAsync().catch(() => {});

function PushBridge() {
  const router = useRouter();
  useEffect(() => {
    return watchPushNotifications((href) => {
      router.push(href);
    });
  }, [router]);
  return null;
}

function AuthGate({
  children,
  holdSplash,
}: {
  children: React.ReactNode;
  holdSplash: boolean;
}) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const root = String(segments[0] ?? "");
    const inAuth =
      root === "(auth)" ||
      root === "login" ||
      root === "register" ||
      root === "forgot-password";
    const atWelcome = !root || root === "index";
    const googleReturn =
      root === "oauth" || root === "google-auth" || root === "+not-found";
    if (googleReturn && !user) {
      router.replace("/");
      return;
    }
    if (user && (inAuth || atWelcome || googleReturn)) {
      router.replace("/(tabs)");
    } else if (!user && !inAuth && !atWelcome) {
      router.replace("/");
    }
  }, [user, loading, segments, router]);

  useEffect(() => {
    if (!loading && !holdSplash) {
      void SplashScreen.hideAsync().catch(() => {});
    }
  }, [loading, holdSplash]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return <>{children}</>;
}

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? "light" : "dark"} />;
}

export default function RootLayout() {
  const [introDone, setIntroDone] = useState(false);
  const finishIntro = useCallback(() => setIntroDone(true), []);

  return (
    <LocaleProvider>
    <ThemeProvider>
    <AuthProvider>
      <View style={{ flex: 1 }}>
      <ThemedStatusBar />
      <GoogleReturnHandler />
      {!introDone ? (
        <VideoSplash onFinished={finishIntro} />
      ) : null}
      <AuthGate holdSplash={!introDone}>
        <CallProvider>
        <PushBridge />
        <PresenceHeartbeat />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="trip/[id]"
            options={{ headerShown: true, title: "Voyage" }}
          />
          <Stack.Screen
            name="trip/new"
            options={{ headerShown: true, title: "Nouveau voyage" }}
          />
          <Stack.Screen
            name="request/[id]"
            options={{ headerShown: true, title: "Demande" }}
          />
          <Stack.Screen
            name="request/new"
            options={{ headerShown: true, title: "Nouvelle demande" }}
          />
          <Stack.Screen
            name="booking/[id]"
            options={{ headerShown: true, title: "Réservation" }}
          />
          <Stack.Screen
            name="services"
            options={{ headerShown: true, title: "Services" }}
          />
          <Stack.Screen
            name="service/new"
            options={{ headerShown: true, title: "Publier un service" }}
          />
          <Stack.Screen
            name="service/[id]"
            options={{ headerShown: true, title: "Service" }}
          />
          <Stack.Screen name="in" options={{ headerShown: true, title: "In" }} />
          <Stack.Screen
            name="messages/[id]"
            options={{ headerShown: true, title: "Conversation" }}
          />
          <Stack.Screen
            name="service-payments/[id]"
            options={{ headerShown: true, title: "Paiement" }}
          />
          <Stack.Screen
            name="in-chat/[id]"
            options={{ headerShown: true, title: "In" }}
          />
          <Stack.Screen
            name="community/[id]"
            options={{ headerShown: true, title: "Publication" }}
          />
          <Stack.Screen
            name="member/[id]"
            options={{ headerShown: true, title: "Profil" }}
          />
          <Stack.Screen
            name="shops/[id]"
            options={{ headerShown: true, title: "Boutique" }}
          />
          <Stack.Screen
            name="meet/index"
            options={{ headerShown: true, title: "Rencontre" }}
          />
          <Stack.Screen
            name="meet/[userId]"
            options={{ headerShown: true, title: "Profil" }}
          />
          <Stack.Screen
            name="shops/product/[id]"
            options={{ headerShown: true, title: "Produit" }}
          />
          <Stack.Screen
            name="shops/orders/index"
            options={{ headerShown: true, title: "Commandes" }}
          />
          <Stack.Screen
            name="shops/orders/[id]"
            options={{ headerShown: true, title: "Commande" }}
          />
          <Stack.Screen
            name="trip/[id]/edit"
            options={{ headerShown: true, title: "Modifier" }}
          />
          <Stack.Screen
            name="request/[id]/edit"
            options={{ headerShown: true, title: "Modifier" }}
          />
          <Stack.Screen
            name="service/[id]/edit"
            options={{ headerShown: true, title: "Modifier" }}
          />
          <Stack.Screen
            name="herald/index"
            options={{ headerShown: true, title: "Héraut Réseau" }}
          />
          <Stack.Screen
            name="shops/new"
            options={{ headerShown: true, title: "Boutique" }}
          />
          <Stack.Screen
            name="shops/[id]/manage"
            options={{ headerShown: true, title: "Gérer" }}
          />
          <Stack.Screen
            name="projects/index"
            options={{ headerShown: true, title: "Mes projets" }}
          />
          <Stack.Screen
            name="admin/index"
            options={{ headerShown: true, title: "Admin" }}
          />
        </Stack>
        <GuidedTour />
        </CallProvider>
      </AuthGate>
      </View>
    </AuthProvider>
    </ThemeProvider>
    </LocaleProvider>
  );
}
