import * as AppleAuthentication from "expo-apple-authentication";
import { useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { canUseAppleSignIn, signInWithAppleNative } from "@/lib/apple-auth";

export function AppleSignInButton({
  disabled,
  onError,
  tone = "dark",
}: {
  disabled?: boolean;
  onError: (message: string) => void;
  tone?: "dark" | "light";
}) {
  const { loginWithApple } = useAuth();
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!canUseAppleSignIn()) return;
    void AppleAuthentication.isAvailableAsync().then(setAvailable);
  }, []);

  if (Platform.OS !== "ios" || !available) return null;

  async function onPress() {
    if (disabled || busy) return;
    setBusy(true);
    try {
      const payload = await signInWithAppleNative();
      await loginWithApple(payload);
    } catch (e) {
      const code =
        e && typeof e === "object" && "code" in e
          ? String((e as { code?: string }).code)
          : "";
      if (code === "ERR_REQUEST_CANCELED") return;
      onError(e instanceof Error ? e.message : "Connexion Apple impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ marginBottom: 12 }}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={
          tone === "dark"
            ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
            : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
        }
        cornerRadius={8}
        style={{ width: "100%", height: 48, opacity: disabled || busy ? 0.6 : 1 }}
        onPress={() => void onPress()}
      />
      {busy ? (
        <Text
          style={{
            color: tone === "dark" ? "rgba(255,255,255,0.8)" : "#5f6368",
            fontSize: 13,
            textAlign: "center",
            marginTop: 8,
          }}
        >
          Connexion avec Apple…
        </Text>
      ) : null}
    </View>
  );
}
