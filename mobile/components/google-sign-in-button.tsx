import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { ActivityIndicator, AppState, Pressable, Text, View } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { googleAuthSessionUrls } from "@/lib/google-auth-url";

WebBrowser.maybeCompleteAuthSession();

export function GoogleSignInButton({
  disabled,
  onMfa,
  onError,
  tone = "dark",
}: {
  disabled?: boolean;
  onMfa: (mfaToken: string, emailHint: string) => void;
  onError: (message: string) => void;
  tone?: "dark" | "light";
}) {
  const { applyGooglePoll } = useAuth();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);

  async function onPress() {
    setBusy(true);
    const sid = Crypto.randomUUID();
    const { start } = googleAuthSessionUrls();
    const startUrl = `${start}&sid=${encodeURIComponent(sid)}`;
    const browser = WebBrowser.openBrowserAsync(startUrl, {
      dismissButtonStyle: "close",
      enableBarCollapsing: true,
    });
    try {
      const deadline = Date.now() + 3 * 60 * 1000;
      while (Date.now() < deadline) {
        if (AppState.currentState === "active") {
          const outcome = await applyGooglePoll(sid);
          if (!outcome.pending) {
            await WebBrowser.dismissBrowser().catch(() => {});
            if ("error" in outcome) {
              onError(outcome.error);
              return;
            }
            if (outcome.mfaRequired) {
              onMfa(outcome.mfaToken, outcome.emailHint);
            }
            return;
          }
        }
        await new Promise<void>((resolve) => {
          const sub = AppState.addEventListener("change", (state) => {
            if (state !== "active") return;
            clearTimeout(timer);
            sub.remove();
            resolve();
          });
          const timer = setTimeout(() => {
            sub.remove();
            resolve();
          }, 1500);
        });
      }
      onError(
        "Délai dépassé. Après Google, revenez dans Expo Go — la connexion se termine toute seule."
      );
    } catch (e) {
      onError(e instanceof Error ? e.message : "Connexion Google impossible");
    } finally {
      await WebBrowser.dismissBrowser().catch(() => {});
      await browser.catch(() => {});
      setBusy(false);
    }
  }

  return (
    <View>
      <Pressable
        onPress={() => void onPress()}
        disabled={disabled || busy}
        style={({ pressed }) => ({
          backgroundColor: "#fff",
          borderRadius: 8,
          height: 48,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 10,
          opacity: disabled || busy ? 0.6 : pressed ? 0.9 : 1,
        })}
      >
        {busy ? (
          <ActivityIndicator color="#1F1F1F" />
        ) : (
          <>
            <GoogleMark />
            <Text style={{ color: "#1F1F1F", fontWeight: "600", fontSize: 16 }}>
              Continuer avec Google
            </Text>
          </>
        )}
      </Pressable>
      {busy ? (
        <Text
          style={{
            color: tone === "dark" ? "rgba(255,255,255,0.8)" : "#5a6754",
            fontSize: 13,
            lineHeight: 18,
            textAlign: "center",
            marginTop: 10,
          }}
        >
          Terminez Google, puis revenez ici. La connexion se termine toute seule.
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginVertical: 16,
          gap: 8,
        }}
      >
        <View style={{ flex: 1, height: 1, backgroundColor: tone === "dark" ? "rgba(255,255,255,0.25)" : "#c5cebc" }} />
        <Text style={{ color: tone === "dark" ? "rgba(255,255,255,0.65)" : "#5a6754", fontSize: 12 }}>ou</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: tone === "dark" ? "rgba(255,255,255,0.25)" : "#c5cebc" }} />
      </View>
    </View>
  );
}

function GoogleMark() {
  return (
    <Text style={{ fontSize: 16, fontWeight: "700" }}>
      <Text style={{ color: "#4285F4" }}>G</Text>
    </Text>
  );
}
